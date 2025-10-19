import express from 'express';
import {
  sendNotification,
  getNotifications,
  markAsRead,
  updatePreferences,
  verifyWhatsApp
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// CEO and Manager only routes
router.post('/send', authorize(['CEO', 'PROJECT_MANAGER']), sendNotification);

// User routes
router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/preferences', updatePreferences);
router.post('/verify-whatsapp', verifyWhatsApp);

export default router;