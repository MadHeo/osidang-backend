import { Router } from 'express';
import authenticateToken from '../middlewares/auth';
import addPlan from '../services/plan/add';
import updatePlan from '../services/plan/update';
import deletePlan from '../services/plan/delete';
import getPlanDetail from '../services/plan/detail';
import getPlans from '../services/plan/get';

const router = Router();

// 계획 추가 API (인증 필요)
router.post('/add', authenticateToken, async (req, res) => {
  addPlan(req, res);
});

// 계획 수정 API (인증 필요)
router.put('/update', authenticateToken, async (req, res) => {
  updatePlan(req, res);
});

// 계획 삭제 API (인증 필요)
router.delete('/delete/:id', authenticateToken, async (req, res) => {
  deletePlan(req, res);
});

// 계획 상세 조회 API (인증 필요)
router.get('/detail/:id', authenticateToken, async (req, res) => {
  getPlanDetail(req, res);
});

// 계획 조회 API (인증 필요)
router.get('/', authenticateToken, async (req, res) => {
  getPlans(req, res);
});

export default router;
