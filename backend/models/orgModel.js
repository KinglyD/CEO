import pkg from 'pg';
const { Pool } = pkg;
import pool from '../config/db.js';

// Create organizations table
const createOrgsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Organizations table created or already exists');
  } catch (err) {
    console.error('❌ Error creating organizations table:', err);
  }
};

// Create roles table
const createRolesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Roles table created or already exists');

    // Insert default roles if they don't exist
    await pool.query(`
      INSERT INTO roles (name, permissions)
      VALUES 
        ('CEO', '{"all": true}'::jsonb),
        ('OFFICER', '{"reports.create": true, "tasks.view": true}'::jsonb),
        ('PROJECT_MANAGER', '{"projects.manage": true, "tasks.manage": true}'::jsonb),
        ('FINANCE', '{"finance.manage": true}'::jsonb),
        ('EVENT_MANAGER', '{"events.manage": true}'::jsonb)
      ON CONFLICT (name) DO NOTHING
    `);
  } catch (err) {
    console.error('❌ Error creating roles table:', err);
  }
};

// Create user_roles junction table
const createUserRolesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, role_id, org_id)
      )
    `);
    console.log('✅ User roles table created or already exists');
  } catch (err) {
    console.error('❌ Error creating user_roles table:', err);
  }
};

// Initialize all tables
const initializeTables = async () => {
  await createOrgsTable();
  await createRolesTable();
  await createUserRolesTable();
};

// Export pool and initialization function
export { pool, initializeTables };