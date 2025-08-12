import { Router } from 'express';
import pool from '../config/database';
import authenticateToken, { AuthRequest } from '../middlewares/auth';
import addClothes from '../services/clothes/add';
import getClothes from '../services/clothes/get';
import updateClothes from '../services/clothes/update';
import deleteClothes from '../services/clothes/delete';
import getClothesDetail from '../services/clothes/detail';

const router = Router();

// 옷 조회 API (인증 필요)
router.get('/', authenticateToken, async (req, res) => {
  getClothes(req, res);
});

// 옷 등록 API (인증 필요)
router.post('/add', authenticateToken, async (req, res) => {
  addClothes(req, res);
});

//옷 수정 API (인증 필요)
router.put('/update', authenticateToken, async (req, res) => {
  updateClothes(req, res);
});

//옷 삭제 API (인증 필요)
router.delete('/delete/:id', authenticateToken, async (req, res) => {
  deleteClothes(req, res);
});

//옷 상세 조회 API (인증 필요)
router.get('/detail/:id', authenticateToken, async (req, res) => {
  getClothesDetail(req, res);
});

export default router;
