import pool from '../../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const login = async (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send('이메일과 비밀번호를 모두 입력해주세요.');
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).send('사용자를 찾을 수 없습니다.');
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
      // Access Token 생성
      const accessToken = jwt.sign(
        {
          id: user.id,
          nickname: user.nickname,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '30d' },
      );

      // Refresh Token 생성 (6개월)
      const refreshToken = jwt.sign(
        {
          id: user.id,
        },
        process.env.REFRESH_TOKEN_SECRET as string,
        { expiresIn: '180d' },
      );

      // Refresh Token을 데이터베이스에 저장
      const refreshTokenExpiresAt = new Date();
      refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 180);

      await pool.query(
        'UPDATE users SET refresh_token = $1, refresh_token_expires_at = $2 WHERE id = $3',
        [refreshToken, refreshTokenExpiresAt, user.id],
      );

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
        },
      });
    } else {
      res.status(401).send('비밀번호가 일치하지 않습니다.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

export default login;
