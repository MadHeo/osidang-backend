import { AuthRequest } from '../../middlewares/auth';
import pool from '../../config/database';
import { bucket } from '../../middlewares/fireabase';
import multer from 'multer';
import path from 'path';

// multer 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일 형식 검사
    //아이폰 촬영 이미지 형식 검사
    const allowedTypes = /jpeg|jpg|png|gif|heic|heif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다 (jpeg, jpg, png, gif)'));
    }
  },
}).single('image');

const addClothes = async (req: any, res: any) => {
  try {
    // Multer 미들웨어를 Promise로 래핑
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err) reject(err);
        resolve(null);
      });
    });

    const authReq = req as AuthRequest;
    const { name, type, brand, color, seasons, metadata } = req.body;

    if (!name) {
      return res.status(400).send('이름은 필수 항목입니다.');
    }

    let image_url = null;

    // 이미지가 업로드된 경우
    if (req.file) {
      // 파일 이름 생성 (유저ID_타임스탬프_원본파일명)
      const fileName = `clothes/${authReq.user?.id}/${Date.now()}_${req.file.originalname}`;
      const fileBuffer = req.file.buffer;

      // Firebase Storage에 업로드
      const file = bucket.file(fileName);
      await file.save(fileBuffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      // 파일의 공개 URL 생성
      await file.makePublic();
      image_url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    const result = await pool.query(
      'INSERT INTO clothes (user_id, name, type, brand, color, seasons, image_url, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [
        authReq.user?.id,
        name,
        type,
        brand,
        color,
        seasons,
        image_url,
        metadata,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('에러 발생:', err);
    if (err instanceof Error && err.message.includes('이미지 파일만 업로드')) {
      res.status(400).send(err.message);
    } else {
      res.status(500).send('서버 에러가 발생했습니다.');
    }
  }
};

export default addClothes;
