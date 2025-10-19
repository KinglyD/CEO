import bcrypt from 'bcryptjs';
import { pool } from '../models/orgModel.js';
import { signToken } from '../utils/jwt.js';

// Create a new organization and register the CEO
export const createOrganization = async (req, res) => {
  const { orgName, name, email, password } = req.body;

  if (!orgName || !name || !email || !password) {
    return res.status(400).json({ 
      message: 'Organization name, user name, email, and password are required.' 
    });
  }

  try {
    // Start transaction
    await pool.query('BEGIN');

    // Create organization
    const orgResult = await pool.query(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
      [orgName]
    );
    const orgId = orgResult.rows[0].id;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password, org_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hashedPassword, orgId]
    );
    const userId = userResult.rows[0].id;

    // Get CEO role ID
    const roleResult = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      ['CEO']
    );
    const roleId = roleResult.rows[0].id;

    // Assign CEO role to user
    await pool.query(
      'INSERT INTO user_roles (user_id, role_id, org_id) VALUES ($1, $2, $3)',
      [userId, roleId, orgId]
    );

    // Commit transaction
    await pool.query('COMMIT');

    // Generate JWT token
    const token = signToken({ 
      id: userId, 
      email,
      orgId,
      roles: ['CEO']
    });

    res.status(201).json({
      message: 'Organization created successfully',
      organization: {
        id: orgId,
        name: orgName
      },
      user: {
        id: userId,
        name,
        email,
        roles: ['CEO']
      },
      token
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error during organization creation' });
  }
};

// Invite a user to the organization
export const inviteUser = async (req, res) => {
  const { name, email, roles } = req.body;
  const orgId = req.user.orgId; // From auth middleware

  if (!name || !email || !roles || !roles.length) {
    return res.status(400).json({ 
      message: 'Name, email, and at least one role are required.' 
    });
  }

  try {
    // Check if email already exists
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    // Start transaction
    await pool.query('BEGIN');

    // Create user (without password - they'll set it when accepting invite)
    const userResult = await pool.query(
      'INSERT INTO users (name, email, org_id, active) VALUES ($1, $2, $3, false) RETURNING id',
      [name, email, orgId]
    );
    const userId = userResult.rows[0].id;

    // Get role IDs and assign them
    for (const roleName of roles) {
      const roleResult = await pool.query(
        'SELECT id FROM roles WHERE name = $1',
        [roleName]
      );
      if (roleResult.rows.length > 0) {
        const roleId = roleResult.rows[0].id;
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id, org_id) VALUES ($1, $2, $3)',
          [userId, roleId, orgId]
        );
      }
    }

    // TODO: Generate invitation token and send email
    // For now, we'll just return success

    await pool.query('COMMIT');

    res.status(201).json({
      message: 'User invited successfully',
      user: {
        id: userId,
        name,
        email,
        roles
      }
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error during user invitation' });
  }
};