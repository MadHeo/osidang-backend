import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';

interface GetPlansRequest {
  year: number;
  month: number;
  day?: number;
}

const getPlans = async (req: any, res: any) => {
  const authReq = req as AuthRequest;
  const { year, month, day } = req.query as unknown as GetPlansRequest;

  if (!year || !month) {
    return res.status(400).send('년도와 월은 필수 항목입니다.');
  }

  // 입력값 검증
  const yearNum = Number(year);
  const monthNum = Number(month);
  const dayNum = day ? Number(day) : undefined;
  
  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).send('올바른 년도와 월을 입력해주세요. (월: 1-12)');
  }

  if (dayNum !== undefined && (isNaN(dayNum) || dayNum < 1 || dayNum > 31)) {
    return res.status(400).send('올바른 일을 입력해주세요. (일: 1-31)');
  }

  try {
    let startDate: string;
    let endDate: string;

    // YYYY-MM-DD 형식으로 변환하는 함수
    const formatDate = (year: number, month: number, day: number) => {
      const yearStr = year.toString();
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      return `${yearStr}-${monthStr}-${dayStr}`;
    };

    if (dayNum !== undefined) {
      // 특정 일자 검색
      startDate = formatDate(yearNum, monthNum, dayNum);
      
      // 다음 날짜 계산 (해당 일의 끝까지)
      const nextDay = new Date(yearNum, monthNum - 1, dayNum + 1);
      endDate = formatDate(nextDay.getFullYear(), nextDay.getMonth() + 1, nextDay.getDate());
    } else {
      // 월 전체 검색
      startDate = formatDate(yearNum, monthNum, 1);
      
      // 다음 달 1일 계산
      const nextMonth = new Date(yearNum, monthNum, 1);
      endDate = formatDate(nextMonth.getFullYear(), nextMonth.getMonth() + 1, nextMonth.getDate());
    }

    // 계획과 연결된 옷 정보를 함께 조회
    const result = await pool.query(
      `
      SELECT 
        p.id,
        p.user_id,
        p.title,
        p.description,
        p.date::text as date,
        p.created_at,
        p.updated_at,
        json_agg(
          json_build_object(
            'id', c.id,
            'name', c.name,
            'type', c.type,
            'brand', c.brand,
            'color', c.color
          ) ORDER BY c.id
        ) FILTER (WHERE c.id IS NOT NULL) as clothes
      FROM plans p
      LEFT JOIN plan_items pi ON p.id = pi.plan_id
      LEFT JOIN clothes c ON pi.clothe_id = c.id
      WHERE p.user_id = $1 
      AND p.date >= $2 
      AND p.date < $3
      GROUP BY p.id, p.user_id, p.title, p.description, p.date, p.created_at, p.updated_at
      ORDER BY p.date ASC
      `,
      [authReq.user?.id, startDate, endDate],
    );

    // 날짜별로 그룹화하여 응답 (date를 문자열로 받아서 직접 사용)
    const plansByDate = result.rows.reduce((acc: any, plan) => {
      const dateKey = plan.date; // 이미 YYYY-MM-DD 형식의 문자열
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
