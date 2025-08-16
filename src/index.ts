import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import usersRoutes from './routes/users';
import clothesRoutes from './routes/clothes';
import planRoutes from './routes/plan';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

// CORS 설정
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000', // 허용된 도메인만 접근 가능
    credentials: true, // 인증 정보 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length', 'X-Requested-With'],
  }),
);

app.use(express.json());

app.use('/users', usersRoutes);
app.use('/clothes', clothesRoutes);
app.use('/plan', planRoutes);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
