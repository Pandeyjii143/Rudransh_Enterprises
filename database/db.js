require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Use PostgreSQL (Railway's default database)
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const db = {
  query: (text, params) => pool.query(text, params),
  get: async (query, params = []) => {
    const { rows } = await pool.query(query, params);
    return rows[0];
  },
  all: async (query, params = []) => {
    const { rows } = await pool.query(query, params);
    return rows;
  },
  run: async (sql, params = []) => {
    const result = await pool.query(sql, params);
    return { lastID: result.rows?.[0]?.id || null, changes: result.rowCount };
  },
};

console.log('Connected to PostgreSQL database');

module.exports = db;
