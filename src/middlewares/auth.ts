import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Request 인터페이스를 확장하여 사용자 정보를 포함하는 커스텀 타입 정의
export interface AuthRequest extends Request {
  user?: { userId: number };
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
  if (token == null) return res.sendStatus(401);

  // JWT 토큰 검증
  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    // 토큰이 유효하지 않은 경우 403 Forbidden 응답
    if (err) return res.sendStatus(403);
    // 검증된 사용자 정보를 요청 객체에 저장
    req.user = user;
    // 다음 미들웨어로 진행
    next();
  });
};

export default authenticateToken;
