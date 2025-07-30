import { Router } from 'express';
import { AuthRequest } from '../middlewares/auth';
import signup from '../services/auth/signup';
import login from '../services/auth/login';
import nickname from '../services/auth/nickname';
import requestVerification from '../services/verify/request-verification';
import verifyEmail from '../services/verify/verify-email';
import forgotPassword from '../services/auth/forgot-password';
import changePassword from '../services/auth/change-password';

const router = Router();

// 사용자 등록 API
router.post('/signup', async (req, res) => {
  signup(req, res);
});

// 로그인 API
router.post('/login', async (req, res) => {
  login(req, res);
});

// 닉네임 수정 API
router.put('/nickname', async (req: AuthRequest, res) => {
  nickname(req, res);
});

// 이메일 인증 요청 API
router.post('/request-verification', async (req, res) => {
  requestVerification(req, res);
});

// 이메일 인증 확인 API (코드 사용)
router.post('/verify-email', async (req, res) => {
  verifyEmail(req, res);
});

// 임시 비밀번호 발급 API
router.post('/forgot-password', async (req, res) => {
  forgotPassword(req, res);
});

// 비밀번호 변경 API
router.post('/change-password', async (req: AuthRequest, res) => {
  changePassword(req, res);
});

export default router;
