import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';
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

const updateClothes = async (req: any, res: any) => {
  try {
    // Multer 미들웨어를 Promise로 래핑
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err) reject(err);
        resolve(null);
      });
    });

    const authReq = req as AuthRequest;
    const { id, name, type, brand, color, seasons, image_url, metadata } =
      req.body;

    if (!id) {
      return res.status(400).send('옷 아이디는 필수 항목입니다.');
    }

    // 옷이 해당 사용자의 것인지 확인
    const ownerCheck = await pool.query(
      'SELECT user_id FROM clothes WHERE id = $1',
      [id],
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).send('옷을 찾을 수 없습니다.');
    }

    if (ownerCheck.rows[0].user_id !== authReq.user?.id) {
      return res.status(403).send('권한이 없습니다.');
    }

    let final_image_url = image_url;

    // 새로운 이미지가 업로드된 경우
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
      final_image_url = downloadUrl;
    }

    // 트랜잭션 시작
    await pool.query('BEGIN');

    // metadata 처리: 빈 문자열이나 null이면 null로, 아니면 JSON 객체로 변환
    let processedMetadata = null;
    if (metadata && metadata.trim() !== '') {
      try {
        // 이미 JSON 객체인 경우 그대로 사용, 문자열인 경우 JSON 객체로 래핑
        processedMetadata = typeof metadata === 'string' 
          ? JSON.stringify({ memo: metadata })
          : JSON.stringify(metadata);
      } catch (e) {
        // JSON 변환 실패시 문자열을 memo 필드로 래핑
        processedMetadata = JSON.stringify({ memo: metadata });
      }
    }

    // 옷 정보 업데이트 (seasons 컬럼 제거)
    const result = await pool.query(
      'UPDATE clothes SET name = $1, type = $2, brand = $3, color = $4, image_url = $5, metadata = $6 WHERE id = $7 RETURNING *',
      [name, type, brand, color, final_image_url, processedMetadata, id],
    );

    // 기존 계절 정보 삭제
    await pool.query('DELETE FROM clothes_seasons WHERE clothes_id = $1', [id]);

    // 새로운 계절 정보 추가
    if (seasons) {
      let parsedSeasons;
      try {
        parsedSeasons = typeof seasons === 'string' ? JSON.parse(seasons) : seasons;
      } catch {
        parsedSeasons = [];
      }

      if (Array.isArray(parsedSeasons) && parsedSeasons.length > 0) {
        const uniqueSeasons = [...new Set(parsedSeasons)];
        for (const seasonId of uniqueSeasons) {
          await pool.query(
            'INSERT INTO clothes_seasons (clothes_id, season_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, seasonId],
          );
        }
      }
    }

    // 트랜잭션 커밋
    await pool.query('COMMIT');

    res.json(result.rows[0]);
  } catch (err) {
    // 트랜잭션 롤백
    await pool.query('ROLLBACK');
    console.error('옷 수정 중 에러 발생:', {
      error: err,
      clothesId: req.body.id,
      userId: req.user?.id,
      seasons: req.body.seasons
    });
    
    if (err instanceof Error && err.message.includes('이미지 파일만 업로드')) {
      res.status(400).send(err.message);
    } else {
      res.status(500).json({
        error: 'Server error',
        message: '옷 정보 수정 중 오류가 발생했습니다.'
      });
    }
  }
};

export default updateClothes;
