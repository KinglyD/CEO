import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database (excluding password)
    const result = await pool.query(
      'SELECT id, email, name, role, org_id FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message || error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Not authorized to access this route'
      });
    }
    next();
  };
};

export { protect, authorize };
