import pkg from 'pg';
import pool from '../config/db.js';
const { Pool } = pkg;

// Create notifications tables
const createNotificationTables = async () => {
  try {
    // Create notification_templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) NOT NULL, -- announcement, reminder, alert, etc.
        channels JSONB DEFAULT '["email", "whatsapp", "in_app"]'::jsonb,
        org_id INTEGER REFERENCES organizations(id),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES notification_templates(id),
        org_id INTEGER REFERENCES organizations(id),
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        status JSONB DEFAULT '{
          "email": "pending",
          "whatsapp": "pending",
          "in_app": "pending"
        }'::jsonb,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create notification_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id SERIAL PRIMARY KEY,
        notification_id INTEGER REFERENCES notifications(id),
        channel VARCHAR(50) NOT NULL, -- email, whatsapp, in_app
        status VARCHAR(50) NOT NULL, -- success, failed
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Notification tables created or already exist');
  } catch (err) {
    console.error('❌ Error creating notification tables:', err);
    throw err;
  }
};

// Initialize tables
createNotificationTables();

export default pool;