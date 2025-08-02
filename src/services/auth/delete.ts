import pool from '../../config/database';

const deleteUser = async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).send('인증되지 않은 사용자입니다.');
    }
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.status(200).send('계정이 성공적으로 삭제되었습니다.');
  } catch (err) {
    console.error('계정 삭제 중 에러 발생:', {
      error: err,
      errorMessage: err instanceof Error ? err.message : '알 수 없는 에러',
      errorStack: err instanceof Error ? err.stack : '알 수 없는 에러 스택',
      userId: req.user?.id,
    });

    res.status(500).send('서버 에러가 발생했습니다.');
  }
};

export default deleteUser;
