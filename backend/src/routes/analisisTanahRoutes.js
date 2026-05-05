import { Router } from 'express';
import {
  calculateOnly,
  getHistory,
  getMyPoints,
  getPointContext,
  saveAnalysis,
  getAdminSoilAnalyses,
  updateAdminRecommendation,
} from '../controllers/analisisTanahController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      message: 'Akses khusus admin.',
    });
  }

  next();
}

router.use(protect);

router.get('/points', getMyPoints);
router.get('/point/:pointId/context', getPointContext);
router.get('/history', getHistory);
router.post('/calculate', calculateOnly);
router.post('/save', saveAnalysis);

router.get('/admin', adminOnly, getAdminSoilAnalyses);
router.put('/admin/:id/recommendation', adminOnly, updateAdminRecommendation);

export default router;