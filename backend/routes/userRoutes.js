import express from 'express';
import { registerUser } from '../controllers/userController.js';

const router = express.Router();

// Registration route
router.post('/register', registerUser);

router.post('/login', loginUser);

export default router;
