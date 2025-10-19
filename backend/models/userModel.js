import pkg from 'pg';
import pool from '../config/db.js'; // Our PostgreSQL connection
const { Pool } = pkg;

// Define user roles
export const USER_ROLES = {
  CEO: 'CEO',
  EMPLOYEE: 'EMPLOYEE', // general employee role
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  FINANCE: 'FINANCE',
  HUMAN_RESOURCE: 'HUMAN_RESOURCE',
  COMMUNICATION: 'COMMUNICATION_OFFICER',
  // Add more roles as needed
};

// Create users table if it doesn't exist
const createUsersTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        phone_number VARCHAR(20),
        whatsapp_number VARCHAR(20),
        notification_preferences JSONB DEFAULT '{"email": true, "whatsapp": false, "in_app": true}'::jsonb,
        org_id INTEGER REFERENCES organizations(id),
        active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        verification_token VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Users table created or already exists');
  } catch (err) {
    console.error('❌ Error creating users table:', err);
  }
};

// Call the function immediately
createUsersTable();

export default pool;
