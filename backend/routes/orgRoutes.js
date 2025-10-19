import express from 'express';
import { createOrganization, inviteUser } from '../controllers/orgController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Create a new organization (and register the CEO)
router.post('/register', createOrganization);

// Invite a user to the organization (CEO only)
router.post('/invite', authMiddleware, inviteUser);

export default router;