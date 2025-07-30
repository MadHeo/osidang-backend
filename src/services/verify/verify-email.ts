import pool from '../../config/database';

const verifyEmail = async (req: any, res: any) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).send('이메일과 인증 코드를 모두 입력해주세요.');
  }

  try {
    // 토큰 조회
    const tokenResult = await pool.query(
      'SELECT email, expires_at FROM verification_tokens WHERE email = $1 AND verification_code = $2 AND type = $3',
      [email, code, 'email_signup'],
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).send('유효하지 않은 인증 코드입니다.');
    }

    const { expires_at } = tokenResult.rows[0];

    // 토큰 만료 확인
    if (new Date() > new Date(expires_at)) {
      return res.status(400).send('만료된 인증 코드입니다.');
    }

    // 사용된 토큰 삭제
    await pool.query('DELETE FROM verification_tokens WHERE email = $1', [
      email,
    ]);

    res.json({
      message: '이메일이 성공적으로 인증되었습니다.',
      email: email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

export default verifyEmail;
