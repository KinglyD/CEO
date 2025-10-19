import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { sendEmail } from '../utils/emailService.js';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Generate random token for email verification/password reset
const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = generateRandomToken();

    // Create user
    const result = await pool.query(
      'INSERT INTO users (name, email, password, verification_token) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
      [name, email, hashedPassword, verificationToken]
    );

    const user = result.rows[0];

    // Send verification email
    await sendEmail({
      to: email,
      template: 'verification',
      data: verificationToken,
    });

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is verified
    if (!user.is_verified) {
      return res.status(400).json({ message: 'Please verify your email first' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      org_id: user.org_id,
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      'UPDATE users SET is_verified = true, verification_token = null WHERE verification_token = $1 RETURNING id, name, email',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    const user = result.rows[0];

    // Send welcome email
    await sendEmail({
      to: user.email,
      template: 'welcome',
      data: user.name,
    });

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate password reset token
    const resetToken = generateRandomToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token and expiry
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, resetTokenExpiry, user.id]
    );

    // Send password reset email
    await sendEmail({
      to: email,
      template: 'passwordReset',
      data: resetToken,
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Find user with valid reset token
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > $2',
      [token, new Date()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password = $1, reset_token = null, reset_token_expiry = null WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export {
  registerUser,
  loginUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
