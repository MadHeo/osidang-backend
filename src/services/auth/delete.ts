import pool from '../../config/database';

const deleteUser = async (req: any, res: any) => {
  try {
    const id = req.user.id; // 인증 미들웨어에서 설정된 사용자 ID

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.status(200).send('계정이 성공적으로 삭제되었습니다.');
  } catch (err) {
    console.error(err);
    res.status(500).send('서버 에러가 발생했습니다.');
  }
};

export default deleteUser;
