import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';

const deletePlan = async (req: any, res: any) => {
  const authReq = req as AuthRequest;
  const planId = req.params.id; // URL 파라미터로 plan ID를 받습니다

  if (!planId) {
    return res.status(400).send('계획 ID는 필수 항목입니다.');
  }

  // 트랜잭션 시작
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 해당 plan이 존재하고 현재 사용자의 것인지 확인
    const planCheck = await client.query(
      'SELECT id FROM plans WHERE id = $1 AND user_id = $2',
      [planId, authReq.user?.id],
    );

    if (planCheck.rows.length === 0) {
      return res
        .status(404)
        .send('해당 계획을 찾을 수 없거나 접근 권한이 없습니다.');
    }

    // 2. plan 삭제
    // plan_items는 CASCADE 설정이 되어 있어 자동으로 삭제됩니다
    await client.query('DELETE FROM plans WHERE id = $1', [planId]);

    await client.query('COMMIT');
    res.status(200).json({ message: '계획이 성공적으로 삭제되었습니다.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Server error');
  } finally {
    client.release();
  }
};

export default deletePlan;
