import { Router } from 'express';
import pool from '../config/database';
import authenticateToken, { AuthRequest } from '../middlewares/auth';

const router = Router();

// 옷 조회 API (인증 필요)
router.get('/', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const result = await pool.query('SELECT * FROM clothes WHERE user_id = $1', [authReq.user?.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// 옷 등록 API (인증 필요)
router.post('/', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { name, type, brand, color, seasons, image_url, metadata } = req.body;
  if (!name || !type) {
    return res.status(400).send('이름과 종류는 필수 항목입니다.');
  }

  try {
    const result = await pool.query(
      'INSERT INTO clothes (user_id, name, type, brand, color, seasons, image_url, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [authReq.user?.userId, name, type, brand, color, seasons, image_url, metadata]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
