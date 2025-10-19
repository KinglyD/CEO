import pkg from 'pg';
import pool from '../config/db.js';
const { Pool } = pkg;

// Create metrics table
const createMetricsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS org_metrics (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id),
        metrics_data JSONB NOT NULL,
        calculated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(org_id, calculated_at)
      )
    `);

    console.log('✅ Metrics table created or already exists');
  } catch (err) {
    console.error('❌ Error creating metrics table:', err);
    throw err;
  }
};

// Initialize table
createMetricsTable();