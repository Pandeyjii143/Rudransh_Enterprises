require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

console.log('Database configuration check:');
console.log('- DATABASE_URL present:', !!DATABASE_URL);
console.log('- NODE_ENV:', process.env.NODE_ENV);

if (!DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set');
  // Don't throw error in production, just warn
  if (process.env.NODE_ENV === 'production') {
    console.warn('Running in production without database - some features may not work');
  } else {
    throw new Error('DATABASE_URL environment variable is required');
  }
}

// Use PostgreSQL (Railway's default database)
let pool;
try {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5, // Further reduced
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000, // Increased
    acquireTimeoutMillis: 60000,
  });

  pool.on('connect', (client) => {
    console.log('New database client connected');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client:', err.message);
  });

  console.log('Database pool created successfully');
} catch (poolError) {
  console.error('Failed to create database pool:', poolError.message);
  // Don't crash the app, but log the error
}

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
