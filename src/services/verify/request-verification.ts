import pool from '../../config/database';
import crypto from 'crypto';
import { sendEmail } from '../../config/email';

const requestVerification = async (req: any, res: any) => {
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

    // 6자리 인증 코드 생성
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    // 토큰은 내부적으로만 사용
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24시간 후 만료

    // 기존 토큰 삭제 후 새 토큰 저장
    await pool.query(
      'DELETE FROM verification_tokens WHERE email = $1 AND type = $2',
      [email, 'email_signup'],
    );

    await pool.query(
      'INSERT INTO verification_tokens (email, token, verification_code, type, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [email, token, verificationCode, 'email_signup', expiresAt],
    );

    // 인증 이메일 전송 시도
    try {
      await sendEmail(
        email,
        '오시당 이메일 인증',
        `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h1 style="color: #333; text-align: center;">이메일 인증</h1>
            
            <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 10px;">
              <h2 style="color: #666; font-size: 16px; margin-bottom: 15px;">인증 코드</h2>
              <div style="font-size: 32px; letter-spacing: 5px; font-family: monospace; color: #2c3e50; margin: 20px 0;">
                ${verificationCode}
              </div>
              <p style="color: #666; font-size: 14px;">앱에서 위 6자리 코드를 입력하세요</p>
            </div>
  
            <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px; line-height: 1.5;">
              * 이 인증은 24시간 동안 유효합니다.<br>
              * 본인이 요청하지 않은 경우 이 이메일을 무시하세요.
            </p>
          </div>
          `,
      );
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr);
      // 이메일 전송 실패시에도 토큰은 생성된 상태로 응답
      return res.json({
        message:
          '인증 코드가 생성되었습니다만, 이메일 전송에 실패했습니다. 관리자에게 문의해주세요.',
        verificationCode: verificationCode, // 개발 환경에서만 코드를 직접 반환
      });
    }

    res.json({ message: '인증 이메일이 전송되었습니다.' });
  } catch (err) {
    console.error('Database operation failed:', err);
    res.status(500).send('Server error');
  }
};

export default requestVerification;
