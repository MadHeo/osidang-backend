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
    return res.status(401).send('Refresh Token이 필요합니다.');
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
      return res.status(403).send('유효하지 않은 Refresh Token입니다.');
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

    res.json({
      accessToken: newAccessToken,
    });
  } catch (err) {
    console.error(err);
    res.status(403).send('Refresh Token이 만료되었습니다.');
  }
};

export default refreshToken;
