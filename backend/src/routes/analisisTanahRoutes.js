import { Router } from 'express';
import {
  calculateOnly,
  getHistory,
  getMyPoints,
  getPointContext,
  saveAnalysis,
} from '../controllers/analisisTanahController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/points', getMyPoints);
router.get('/point/:pointId/context', getPointContext);
router.get('/history', getHistory);
router.post('/calculate', calculateOnly);
router.post('/save', saveAnalysis);

export default router;