import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';

const router = Router();
const saltRounds = 10;

// 사용자 등록 API
router.post('/register', async (req, res) => {
  const { email, password, nickname } = req.body;
  if (!email || !password) {
    return res.status(400).send('이메일과 비밀번호를 모두 입력해주세요.');
  }

  try {
    const password_hash = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id, email, nickname, created_at',
      [email, password_hash, nickname || null],
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      // unique_violation
      return res.status(409).send('이미 사용중인 이메일입니다.');
    }
    console.error(err);
    res.status(500).send('Server error');
  }
});

// 로그인 API
router.post('/login', async (req, res) => {
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
      const token = jwt.sign(
        {
          userId: user.id,
          nickname: user.nickname,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '1h' },
      );
      res.json({
        token,
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
});

// 닉네임 수정 API
router.put('/nickname', async (req: AuthRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).send('인증이 필요합니다.');
  }

  const { nickname } = req.body;

  if (!nickname) {
    return res.status(400).send('닉네임을 입력해주세요.');
  }

  try {
    const result = await pool.query(
      'UPDATE users SET nickname = $1 WHERE id = $2 RETURNING id, email, nickname',
      [nickname, req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).send('사용자를 찾을 수 없습니다.');
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
