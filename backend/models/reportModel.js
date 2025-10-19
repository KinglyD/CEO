import pkg from 'pg';
import pool from '../config/db.js';
const { Pool } = pkg;

// Create reports table
const createReportsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS report_templates (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        fields JSONB NOT NULL,
        required_frequency VARCHAR(50), -- daily, weekly, monthly, quarterly, custom
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS submitted_reports (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES report_templates(id),
        org_id INTEGER REFERENCES organizations(id),
        submitted_by INTEGER REFERENCES users(id),
        report_data JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
        reviewed_by INTEGER REFERENCES users(id),
        review_notes TEXT,
        submission_date TIMESTAMP DEFAULT NOW(),
        review_date TIMESTAMP,
        reporting_period_start DATE,
        reporting_period_end DATE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS report_comments (
        id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES submitted_reports(id),
        user_id INTEGER REFERENCES users(id),
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Reports tables created or already exist');
  } catch (err) {
    console.error('❌ Error creating reports tables:', err);
    throw err;
  }
};

// Initialize tables
createReportsTable();

export default pool;
