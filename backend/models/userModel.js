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
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
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
