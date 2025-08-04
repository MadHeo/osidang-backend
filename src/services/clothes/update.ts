import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';

const updateClothes = async (req: any, res: any) => {
  const authReq = req as AuthRequest;
  const { id, name, type, brand, color, seasons, image_url, metadata } =
    req.body;

  if (!id) {
    return res.status(400).send('옷 아이디는 필수 항목입니다.');
  }

  try {
    const result = await pool.query(
      'UPDATE clothes SET name = $1, type = $2, brand = $3, color = $4, seasons = $5, image_url = $6, metadata = $7 WHERE id = $8',
      [name, type, brand, color, seasons, image_url, metadata, id],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

export default updateClothes;
