import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';

const deleteClothes = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).send('옷 아이디는 필수 항목입니다.');
    }

    const result = await pool.query('DELETE FROM clothes WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).send('옷을 찾을 수 없습니다.');
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

export default deleteClothes;
