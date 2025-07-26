import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { sendEmail } from '../config/email';
import crypto from 'crypto';

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

// 이메일 인증 요청 API
router.post('/request-verification', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send('이메일을 입력해주세요.');
  }

  try {
    // 이미 가입된 이메일인지 확인
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );

    if (userResult.rows.length > 0) {
      return res.status(400).send('이미 가입된 이메일입니다.');
    }

    // 인증 토큰 생성
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24시간 후 만료

    // 기존 토큰 삭제 후 새 토큰 저장
    await pool.query(
      'DELETE FROM verification_tokens WHERE email = $1 AND type = $2',
      [email, 'email_signup'],
    );

    await pool.query(
      'INSERT INTO verification_tokens (email, token, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, token, 'email_signup', expiresAt],
    );

    // 인증 이메일 전송
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    await sendEmail(
      email,
      '이메일 인증',
      `
      <h1>이메일 인증</h1>
      <p>아래 링크를 클릭하여 이메일을 인증해주세요:</p>
      <a href="${verificationLink}">이메일 인증하기</a>
      <p>이 링크는 24시간 동안 유효합니다.</p>
      `,
    );

    res.json({ message: '인증 이메일이 전송되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// 이메일 인증 확인 API
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).send('인증 토큰이 필요합니다.');
  }

  try {
    // 토큰 조회
    const tokenResult = await pool.query(
      'SELECT email, expires_at FROM verification_tokens WHERE token = $1 AND type = $2',
      [token, 'email_signup'],
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).send('유효하지 않은 토큰입니다.');
    }

    const { email, expires_at } = tokenResult.rows[0];

    // 토큰 만료 확인
    if (new Date() > new Date(expires_at)) {
      return res.status(400).send('만료된 토큰입니다.');
    }

    // 사용된 토큰 삭제
    await pool.query('DELETE FROM verification_tokens WHERE token = $1', [
      token,
    ]);

    res.json({
      message: '이메일이 성공적으로 인증되었습니다.',
      email: email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// 임시 비밀번호 발급 API
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send('이메일을 입력해주세요.');
  }

  try {
    // 사용자 확인
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );

    if (userResult.rows.length === 0) {
      // 보안을 위해 사용자가 없어도 성공 메시지 반환
      return res.json({ message: '임시 비밀번호가 이메일로 전송되었습니다.' });
    }

    // 임시 비밀번호 생성 (8자리 랜덤 문자열)
    const tempPassword = crypto.randomBytes(4).toString('hex');

    // 임시 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

    // 비밀번호 업데이트
    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE email = $2',
      [hashedPassword, email],
    );

    // 임시 비밀번호 이메일 발송
    await sendEmail(
      email,
      '임시 비밀번호 발급',
      `
      <h1>임시 비밀번호 발급</h1>
      <p>임시 비밀번호: <strong>${tempPassword}</strong></p>
      <p>보안을 위해 로그인 후 반드시 비밀번호를 변경해주세요.</p>
      `,
    );

    res.json({ message: '임시 비밀번호가 이메일로 전송되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// 비밀번호 변경 API
router.post('/change-password', async (req: AuthRequest, res) => {
  if (!req.user?.userId) {
    return res.status(401).send('인증이 필요합니다.');
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .send('현재 비밀번호와 새 비밀번호를 모두 입력해주세요.');
  }

  if (newPassword.length < 8) {
    return res.status(400).send('비밀번호는 8자 이상이어야 합니다.');
  }

  try {
    // 현재 사용자 정보 조회
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).send('사용자를 찾을 수 없습니다.');
    }

    // 현재 비밀번호 확인
    const match = await bcrypt.compare(
      currentPassword,
      userResult.rows[0].password_hash,
    );

    if (!match) {
      return res.status(400).send('현재 비밀번호가 일치하지 않습니다.');
    }

    // 새 비밀번호 해시화
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 비밀번호 업데이트
    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.userId],
    );

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
