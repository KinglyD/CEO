import express from 'express';
import {
  createReportTemplate,
  getReportTemplates,
  submitReport,
  reviewReport,
  generateReportPDF,
  addReportComment
} from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Report template routes
router.post('/templates', authorize(['CEO', 'PROJECT_MANAGER']), createReportTemplate);
router.get('/templates', getReportTemplates);

// Report submission and review routes
router.post('/submit', submitReport);
router.put('/:id/review', authorize(['CEO', 'PROJECT_MANAGER']), reviewReport);

// Report generation route
router.get('/:id/pdf', generateReportPDF);

// Report comments route
router.post('/:id/comments', addReportComment);

export default router;
