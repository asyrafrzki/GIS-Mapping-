import { Router } from 'express';
import {
  calculateOnly,
  getHistory,
  getLatestAnalysisByPoint,
  getMyPointsForAnalysis,
  saveAnalysis,
} from '../controllers/analisisTanahController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/points', getMyPointsForAnalysis);
router.get('/history', getHistory);
router.get('/point/:pointId/latest', getLatestAnalysisByPoint);
router.post('/calculate', calculateOnly);
router.post('/save', saveAnalysis);

export default router;