import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Request 인터페이스를 확장하여 사용자 정보를 포함하는 커스텀 타입 정의
export interface AuthRequest extends Request {
  user?: {
    id: number;
    nickname: string;
  };
}

// JWT 토큰을 검증하는 미들웨어
const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  // Authorization 헤더에서 토큰 추출
  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1];

  // 토큰이 없는 경우 401 Unauthorized 응답
  if (token == null) {
    return res.status(401).json({
      error: 'ACCESS_TOKEN_REQUIRED',
      message: 'Access Token이 필요합니다.'
    });
  }

  // 환경 변수 검증
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET not configured');
    return res.status(500).json({
      error: 'SERVER_CONFIGURATION_ERROR',
      message: '서버 설정 오류입니다.'
    });
  }

  // JWT 토큰 검증
  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    // 토큰이 유효하지 않은 경우 403 Forbidden 응답
    if (err) {
      console.error('토큰 검증 실패:', {
        error: err,
        errorMessage: err.message,
        errorName: err.name,
      });

      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'ACCESS_TOKEN_EXPIRED',
          message: 'Access Token이 만료되었습니다.'
        });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({
          error: 'INVALID_ACCESS_TOKEN',
          message: '유효하지 않은 Access Token입니다.'
        });
      } else {
        return res.status(403).json({
          error: 'TOKEN_VERIFICATION_FAILED',
          message: '토큰 검증에 실패했습니다.'
        });
      }
    }

    // 검증된 사용자 정보를 요청 객체에 저장
    req.user = user;
    // 다음 미들웨어로 진행
    next();
  });
};

export default authenticateToken;
