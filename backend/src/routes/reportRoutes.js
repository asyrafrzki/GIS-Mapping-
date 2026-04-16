import { Router } from 'express';
import {
  createReportFromPoint,
  deleteMyReport,
  getAllReports,
  getMyReports,
  updateReportStatus,
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

const router = Router();

router.get('/me', protect, getMyReports);
router.post('/from-point/:pointId', protect, createReportFromPoint);
router.delete('/me/:id', protect, deleteMyReport);

router.get('/admin', protect, allowRoles('admin'), getAllReports);
router.put('/admin/:id', protect, allowRoles('admin'), updateReportStatus);

export default router;