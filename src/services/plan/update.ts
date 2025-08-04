import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';

interface UpdatePlanRequest {
  planId: number;
  clothesIds: number[]; // 새로 연결할 옷 ID 배열
}

const updatePlan = async (req: any, res: any) => {
  const authReq = req as AuthRequest;
  const { planId, clothesIds } = req.body as UpdatePlanRequest;

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

    // 2. 기존 plan_items 연결 모두 제거
    await client.query('DELETE FROM plan_items WHERE plan_id = $1', [planId]);

    // 3. 새로운 옷 항목들을 plan_items 테이블에 추가
    if (clothesIds && clothesIds.length > 0) {
      const values = clothesIds
        .map((clotheId) => {
          return `(${planId}, ${clotheId})`;
        })
        .join(', ');

      await client.query(
        `INSERT INTO plan_items (plan_id, clothe_id) VALUES ${values}`,
      );
    }

    await client.query('COMMIT');

    // 4. 수정된 계획과 연결된 옷 정보를 함께 조회
    const finalResult = await client.query(
      `
      SELECT 
        p.*,
        json_agg(c.* ORDER BY c.id) FILTER (WHERE c.id IS NOT NULL) as clothes
      FROM plans p
      LEFT JOIN plan_items pi ON p.id = pi.plan_id
      LEFT JOIN clothes c ON pi.clothe_id = c.id
      WHERE p.id = $1
      GROUP BY p.id
      `,
      [planId],
    );

    res.status(200).json(finalResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Server error');
  } finally {
    client.release();
  }
};

export default updatePlan;
