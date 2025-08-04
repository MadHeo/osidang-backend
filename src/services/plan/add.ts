import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';

interface AddPlanRequest {
  title: string;
  description?: string;
  date: string;
  clothesIds: number[]; // 여러 개의 옷 ID를 받을 수 있도록 배열로 정의
}

const addPlan = async (req: any, res: any) => {
  const authReq = req as AuthRequest;
  const { title, description, date, clothesIds } = req.body as AddPlanRequest;

  if (!title || !date) {
    return res.status(400).send('제목과 날짜는 필수 항목입니다.');
  }

  // 트랜잭션 시작
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 계획 추가
    const planResult = await client.query(
      'INSERT INTO plans (user_id, title, description, date) VALUES ($1, $2, $3, $4) RETURNING *',
      [authReq.user?.id, title, description, date],
    );
    const plan = planResult.rows[0];

    // 2. 옷 항목들을 plan_items 테이블에 추가
    if (clothesIds && clothesIds.length > 0) {
      const values = clothesIds
        .map((clotheId) => {
          return `(${plan.id}, ${clotheId})`;
        })
        .join(', ');

      await client.query(
        `INSERT INTO plan_items (plan_id, clothe_id) VALUES ${values}`,
      );
    }

    await client.query('COMMIT');

    // 3. 추가된 계획과 연결된 옷 정보를 함께 조회
    const finalResult = await client.query(
      `
      SELECT 
        p.*,
        json_agg(c.*) as clothes
      FROM plans p
      LEFT JOIN plan_items pi ON p.id = pi.plan_id
      LEFT JOIN clothes c ON pi.clothe_id = c.id
      WHERE p.id = $1
      GROUP BY p.id
      `,
      [plan.id],
    );

    res.status(201).json(finalResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Server error');
  } finally {
    client.release();
  }
};

export default addPlan;
