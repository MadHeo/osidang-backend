import pool from '../../config/database';

const nickname = async (req: any, res: any) => {
  if (!req.user?.id) {
    return res.status(401).send('인증이 필요합니다.');
  }

  const { nickname } = req.body;

  if (!nickname) {
    return res.status(400).send('닉네임을 입력해주세요.');
  }

  try {
    const result = await pool.query(
      'UPDATE users SET nickname = $1 WHERE id = $2 RETURNING id, email, nickname',
      [nickname, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).send('사용자를 찾을 수 없습니다.');
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

export default nickname;
