import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';

const getClothesDetail = async (req: any, res: any) => {
  const authReq = req as AuthRequest;
  const clothesId = req.params.id;

  if (!clothesId) {
    return res.status(400).send('옷 아이디는 필수 항목입니다.');
  }

  try {
    const clothesResult = await pool.query('SELECT * FROM clothes WHERE id = $1', [
      clothesId,
    ]);

    if (clothesResult.rows.length === 0) {
      return res.status(404).send('옷을 찾을 수 없습니다.');
    }

    const seasonResult = await pool.query(
      `SELECT s.id, s.name 
       FROM seasons s 
       JOIN clothes_seasons cs ON s.id = cs.season_id 
       WHERE cs.clothes_id = $1`,
      [clothesId]
    );

    const clothesData = {
      ...clothesResult.rows[0],
      seasons: seasonResult.rows
    };

    res.status(200).json(clothesData);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

export default getClothesDetail;
