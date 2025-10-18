console.log('Starting server.js...');

import express from 'express';
console.log('Imported express.');

import cors from 'cors';
console.log('Imported cors.');

import dotenv from 'dotenv';
console.log('Imported dotenv.');

import userRoutes from './routes/userRoutes.js';
console.log('Imported userRoutes.');

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
app.use('/api/users', userRoutes);
console.log('/api/users route used.');

app.get('/', (req, res) => {
  res.send('API is running...');
});
console.log('/ route created.');

// Start server
try {
  const PORT = process.env.PORT || 5000;
  console.log(`Attempting to listen on port ${PORT}...`);
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  console.log('app.listen called, server should be running.');
} catch (e) {
  console.error('Error during server startup:', e);
  process.exit(1);
}
