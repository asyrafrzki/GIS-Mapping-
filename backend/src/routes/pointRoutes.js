import { Router } from 'express';
import {
  createPoint,
  deletePoint,
  getMyPoints,
  updatePoint,
} from '../controllers/pointController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);
router.get('/', getMyPoints);
router.post('/', createPoint);
router.put('/:id', updatePoint);
router.delete('/:id', deletePoint);

export default router;