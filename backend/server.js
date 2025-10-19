import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import userRoutes from './routes/userRoutes.js';
import orgRoutes from './routes/orgRoutes.js';
import authRoutes from './routes/authRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { initializeTables } from './models/orgModel.js';
import { verifyEmailConfig } from './utils/emailService.js';
import errorHandler from './middleware/errorHandler.js';
import scheduler from './utils/scheduler.js';

dotenv.config();
console.log('dotenv.config() called.');

const app = express();
console.log('Express app created.');

// Middleware
app.use(cors());
console.log('cors middleware used.');

app.use(express.json());
console.log('express.json middleware used.');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/organizations', orgRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

// Initialize database tables and verify email configuration
Promise.all([initializeTables(), verifyEmailConfig()])
  .then(([_, emailConfigValid]) => {
    if (!emailConfigValid) {
      console.warn('⚠️ Email service not properly configured');
    }
    
    // Initialize scheduled tasks
    scheduler.initializeScheduledTasks();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  });
