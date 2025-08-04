import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';

const getPlanDetail = async (req: any, res: any) => {
  const authReq = req as AuthRequest;
  const planId = req.params.id;

  if (!planId) {
    return res.status(400).send('계획 ID는 필수 항목입니다.');
  }

  try {
    // 계획과 연결된 옷 정보를 상세하게 조회
    const result = await pool.query(
      `
      SELECT 
        p.*,
        json_agg(
          CASE WHEN c.id IS NOT NULL THEN
            json_build_object(
              'id', c.id,
              'name', c.name,
              'type', c.type,
              'brand', c.brand,
              'color', c.color,
              'image_url', c.image_url,
              'metadata', c.metadata,
              'seasons', (
                SELECT json_agg(s.name)
                FROM clothes_seasons cs
                JOIN seasons s ON s.id = cs.season_id
                WHERE cs.clothes_id = c.id
              )
            )
          END
        ) FILTER (WHERE c.id IS NOT NULL) as clothes
      FROM plans p
      LEFT JOIN plan_items pi ON p.id = pi.plan_id
      LEFT JOIN clothes c ON pi.clothe_id = c.id
      WHERE p.id = $1 AND p.user_id = $2
      GROUP BY p.id
      `,
      [planId, authReq.user?.id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .send('해당 계획을 찾을 수 없거나 접근 권한이 없습니다.');
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

export default getPlanDetail;
