import pool from '../../config/database';
import jwt from 'jsonwebtoken';

// 타입 정의 추가
interface JwtPayload {
  id: number;
  nickname?: string;
}

const refreshToken = async (req: any, res: any) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      error: 'REFRESH_TOKEN_REQUIRED',
      message: 'Refresh Token이 필요합니다.'
    });
  }

  // 환경 변수 검증
  if (!process.env.REFRESH_TOKEN_SECRET || !process.env.JWT_SECRET) {
    console.error('JWT secrets not configured');
    return res.status(500).json({
      error: 'SERVER_CONFIGURATION_ERROR',
      message: '서버 설정 오류입니다.'
    });
  }

  try {
    // Refresh Token 검증
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string,
    ) as JwtPayload;

    // 데이터베이스에서 사용자 확인 및 만료 시간 체크
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND refresh_token = $2 AND refresh_token_expires_at > NOW()',
      [decoded.id, refreshToken],
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'INVALID_REFRESH_TOKEN',
        message: '유효하지 않거나 만료된 Refresh Token입니다.'
      });
    }

    const user = result.rows[0];

    // 새로운 Access Token 발급
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        nickname: user.nickname,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' },
    );

    // 새로운 Refresh Token 발급 (보안 강화)
    const newRefreshToken = jwt.sign(
      {
        id: user.id,
      },
      process.env.REFRESH_TOKEN_SECRET as string,
      { expiresIn: '180d' },
    );

    // 새로운 Refresh Token을 데이터베이스에 업데이트
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 180);

    await pool.query(
      'UPDATE users SET refresh_token = $1, refresh_token_expires_at = $2 WHERE id = $3',
      [newRefreshToken, refreshTokenExpiresAt, user.id],
    );

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    });
  } catch (err: any) {
    console.error('Refresh token error:', {
      error: err,
      message: err.message,
      name: err.name,
      refreshToken: refreshToken ? '[REDACTED]' : 'null'
    });
    
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({
        error: 'REFRESH_TOKEN_EXPIRED',
        message: 'Refresh Token이 만료되었습니다.'
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({
        error: 'INVALID_REFRESH_TOKEN',
        message: '유효하지 않은 Refresh Token입니다.'
      });
    } else {
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
};

export default refreshToken;
