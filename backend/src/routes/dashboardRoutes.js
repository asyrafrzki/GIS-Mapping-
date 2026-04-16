import { Router } from 'express';
import {
  getAdminDashboard,
  getUserDashboard,
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

const router = Router();

router.get('/user', protect, allowRoles('user'), getUserDashboard);
router.get('/admin', protect, allowRoles('admin'), getAdminDashboard);

export default router;