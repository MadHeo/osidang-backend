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
      const fileName = `users/${authReq.user?.id}/clothes/${Date.now()}_${req.file.originalname}`;
      const fileBuffer = req.file.buffer;

      // Firebase Storage에 업로드
      const file = bucket.file(fileName);
      await file.save(fileBuffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      // Firebase Storage의 다운로드 URL 생성 (토큰 포함)
      const [downloadUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491' // 매우 먼 미래 날짜로 설정
      });
      image_url = downloadUrl;
    }

    // 트랜잭션 시작
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 먼저 옷 정보를 저장 (seasons 컬럼 제거)
      const clothesResult = await client.query(
        'INSERT INTO clothes (user_id, name, type, brand, color, image_url, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [
          authReq.user?.id,
          name,
          type,
          brand,
          color,
          image_url,
          metadata,
        ],
      );

      const clothesId = clothesResult.rows[0].id;

      // seasons가 있는 경우 관계 테이블에 저장
      if (seasons) {
        let parsedSeasons;
        try {
          parsedSeasons = typeof seasons === 'string' ? JSON.parse(seasons) : seasons;
        } catch {
          parsedSeasons = [];
        }

        if (Array.isArray(parsedSeasons) && parsedSeasons.length > 0) {
          // 각 계절을 seasons 테이블에서 찾아서 관계 설정
          for (const seasonName of parsedSeasons) {
            // seasons 테이블에서 해당 계절 ID 찾기 (없으면 생성)
            let seasonResult = await client.query(
              'SELECT id FROM seasons WHERE name = $1',
              [seasonName]
            );

            let seasonId;
            if (seasonResult.rows.length === 0) {
              // 계절이 없으면 새로 생성
              const newSeasonResult = await client.query(
                'INSERT INTO seasons (name) VALUES ($1) RETURNING id',
                [seasonName]
              );
              seasonId = newSeasonResult.rows[0].id;
            } else {
              seasonId = seasonResult.rows[0].id;
            }

            // clothes_seasons 테이블에 관계 설정
            await client.query(
              'INSERT INTO clothes_seasons (clothes_id, season_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [clothesId, seasonId]
            );
          }
        }
      }

      await client.query('COMMIT');
      
      // 생성된 옷 정보와 함께 계절 정보도 반환
      const finalResult = await client.query(`
        SELECT c.*, 
               COALESCE(array_agg(s.name) FILTER (WHERE s.name IS NOT NULL), '{}') as seasons
        FROM clothes c
        LEFT JOIN clothes_seasons cs ON c.id = cs.clothes_id
        LEFT JOIN seasons s ON cs.season_id = s.id
        WHERE c.id = $1
        GROUP BY c.id
      `, [clothesId]);

      res.status(201).json(finalResult.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
