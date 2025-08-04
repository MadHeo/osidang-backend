import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';

interface GetClothesQuery {
  name?: string;
  brand?: string;
  season?: string;
  type?: string;
}

// 옷 이름 조회, 브랜드 조회, 계절 조회, 종류 조회
const getClothes = async (req: any, res: any) => {
  const authReq = req as AuthRequest;
  const { name, brand, season, type } = req.query as GetClothesQuery;

  if (!authReq.user?.id) {
    return res.status(401).send('인증이 필요합니다.');
  }

  try {
    let query = `
      SELECT 
        c.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', s.id,
            'name', s.name
          )
        ) FILTER (WHERE s.id IS NOT NULL) as seasons
      FROM clothes c
      LEFT JOIN clothes_seasons cs ON c.id = cs.clothes_id
      LEFT JOIN seasons s ON cs.season_id = s.id
      WHERE c.user_id = $1
    `;

    const values: (string | number)[] = [authReq.user.id];
    let paramCount = 1;

    if (name) {
      paramCount++;
      query += ` AND c.name ILIKE $${paramCount}`; // ILIKE for case-insensitive search
      values.push(`%${name}%`); // 부분 일치 검색 지원
    }

    if (brand) {
      paramCount++;
      query += ` AND c.brand ILIKE $${paramCount}`;
      values.push(`%${brand}%`);
    }

    if (type) {
      paramCount++;
      query += ` AND c.type = $${paramCount}`;
      values.push(type);
    }

    // 계절 검색은 clothes_seasons 테이블을 통해 처리
    if (season) {
      paramCount++;
      query += ` AND EXISTS (
        SELECT 1 FROM clothes_seasons cs2
        JOIN seasons s2 ON cs2.season_id = s2.id
        WHERE cs2.clothes_id = c.id AND s2.name = $${paramCount}
      )`;
      values.push(season);
    }

    // Group by를 추가하여 각 옷별로 계절 정보를 그룹화
    query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const result = await pool.query(query, values);

    // seasons가 null인 경우 빈 배열로 변환
    const clothes = result.rows.map((cloth) => ({
      ...cloth,
      seasons: cloth.seasons || [],
    }));

    res.json(clothes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

export default getClothes;
