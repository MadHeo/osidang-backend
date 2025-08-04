import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';

interface GetPlansRequest {
  year: number;
  month: number;
}

const getPlans = async (req: any, res: any) => {
  const authReq = req as AuthRequest;
  const { year, month } = req.query as unknown as GetPlansRequest;

  if (!year || !month) {
    return res.status(400).send('년도와 월은 필수 항목입니다.');
  }

  try {
    // 해당 월의 시작일과 다음 월의 시작일을 계산
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    // 계획과 연결된 옷 정보를 함께 조회
    const result = await pool.query(
      `
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'id', c.id,
            'name', c.name,
            'type', c.type,
            'brand', c.brand,
            'color', c.color,
            'image_url', c.image_url
          ) ORDER BY c.id
        ) FILTER (WHERE c.id IS NOT NULL) as clothes
      FROM plans p
      LEFT JOIN plan_items pi ON p.id = pi.plan_id
      LEFT JOIN clothes c ON pi.clothe_id = c.id
      WHERE p.user_id = $1 
      AND p.date >= $2 
      AND p.date < $3
      GROUP BY p.id
      ORDER BY p.date ASC
      `,
      [authReq.user?.id, startDate, endDate],
    );

    // 날짜별로 그룹화하여 응답
    const plansByDate = result.rows.reduce((acc: any, plan) => {
      const dateKey = plan.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(plan);
      return acc;
    }, {});

    res.status(200).json(plansByDate);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

export default getPlans;
