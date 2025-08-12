import pool from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';
import { bucket } from '../../middlewares/fireabase';

const deleteClothes = async (req: any, res: any) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).send('옷 아이디는 필수 항목입니다.');
    }

    // 트랜잭션 시작
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 옷이 존재하고 해당 사용자의 것인지 확인
      const clothesCheck = await client.query(
        'SELECT user_id, image_url FROM clothes WHERE id = $1',
        [id]
      );

      if (clothesCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).send('옷을 찾을 수 없습니다.');
      }

      const clothes = clothesCheck.rows[0];
      
      // 사용자 소유권 확인
      if (clothes.user_id !== authReq.user?.id) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(403).send('권한이 없습니다.');
      }

      // Firebase Storage에서 이미지 삭제 (이미지가 있는 경우)
      if (clothes.image_url) {
        try {
          // Firebase Storage URL에서 파일 경로 추출
          const urlParts = clothes.image_url.split('/');
          const filePathIndex = urlParts.findIndex((part: string) => part === 'o') + 1;
          if (filePathIndex > 0 && filePathIndex < urlParts.length) {
            let filePath = urlParts[filePathIndex];
            // URL 디코딩 및 쿼리 파라미터 제거
            filePath = decodeURIComponent(filePath.split('?')[0]);
            
            const file = bucket.file(filePath);
            const [exists] = await file.exists();
            if (exists) {
              await file.delete();
            }
          }
        } catch (imageError) {
          console.warn('Firebase Storage 이미지 삭제 중 오류:', imageError);
          // 이미지 삭제 실패는 전체 삭제를 막지 않음
        }
      }

      // clothes_seasons 관계 삭제 (CASCADE로 자동 삭제되지만 명시적으로 처리)
      await client.query('DELETE FROM clothes_seasons WHERE clothes_id = $1', [id]);

      // plan_items에서도 삭제 (CASCADE로 자동 삭제되지만 명시적으로 처리)
      await client.query('DELETE FROM plan_items WHERE clothe_id = $1', [id]);

      // 옷 정보 삭제
      const deleteResult = await client.query('DELETE FROM clothes WHERE id = $1', [id]);

      await client.query('COMMIT');
      client.release();

      res.status(204).send();
      
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
    
  } catch (err) {
    console.error('옷 삭제 중 에러 발생:', {
      error: err,
      clothesId: req.params.id,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Server error',
      message: '옷 삭제 중 오류가 발생했습니다.'
    });
  }
};

export default deleteClothes;
