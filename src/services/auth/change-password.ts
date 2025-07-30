import pool from '../../config/database';
import bcrypt from 'bcrypt';

const saltRounds = 10;

const changePassword = async (req: any, res: any) => {
  if (!req.user?.id) {
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
      [req.user.id],
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
      [newPasswordHash, req.user.id],
    );

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

export default changePassword;
