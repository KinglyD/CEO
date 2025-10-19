import express from 'express';
import {
  getOrgOverview,
  getActivityLog,
  getUserPerformance,
  getTeamPerformance
} from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Dashboard routes
router.get('/overview', getOrgOverview);
router.get('/activity', getActivityLog);
router.get('/performance/:userId', getUserPerformance);
router.get('/team', authorize(['CEO', 'PROJECT_MANAGER']), getTeamPerformance);

export default router;