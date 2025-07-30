import pool from '../../config/database';
import { sendEmail } from '../../config/email';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const saltRounds = 10;

const forgotPassword = async (req: any, res: any) => {
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
};

export default forgotPassword;
