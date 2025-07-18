import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';

const router = Router();
const saltRounds = 10;

// 사용자 등록 API
router.post('/register', async (req, res) => {
  const { email, password, nickname, privacyPolicyAgreed } = req.body;

  // 필수 입력값 검증
  if (!email || !password) {
    return res.status(400).send('이메일과 비밀번호를 모두 입력해주세요.');
  }

  // 개인정보 처리방침 동의 여부 확인
  if (!privacyPolicyAgreed) {
    return res.status(400).send('개인정보 처리방침 동의가 필요합니다.');
  }

  //닉네임 중복 확인
  const nicknameCheckResult = await pool.query(
    'SELECT id FROM users WHERE nickname = $1',
    [nickname],
  );
  if (nicknameCheckResult.rows.length > 0) {
    return res.status(400).send('이미 사용중인 닉네임입니다.');
  }

  try {
    // 트랜잭션 시작
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 사용자 등록
      const password_hash = await bcrypt.hash(password, saltRounds);
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id, email, nickname, created_at',
        [email, password_hash, nickname || null],
      );

      // 최신 개인정보 처리방침 버전 조회
      const policyVersionResult = await client.query(
        'SELECT id FROM privacy_policy_versions ORDER BY effective_date DESC LIMIT 1',
      );

      // 개인정보 처리방침 동의 기록
      await client.query(
        'INSERT INTO privacy_policy_consents (user_id, policy_version_id, consent_type, is_agreed, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [
          userResult.rows[0].id,
          policyVersionResult.rows[0].id,
          'privacy_policy',
          true,
          req.ip,
        ],
      );

      await client.query('COMMIT');
      res.status(201).json(userResult.rows[0]);
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        // unique_violation
        return res.status(409).send('이미 사용중인 이메일입니다.');
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
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
