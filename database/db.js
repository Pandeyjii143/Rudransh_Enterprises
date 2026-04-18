require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const sqlite3 = require('sqlite3').verbose();

let db;

if (DATABASE_URL) {
  // PostgreSQL fallback connection would be handled outside of this file for full migration
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  db = {
    query: (text, params) => pool.query(text, params),
    get: async (query, params = []) => {
      const { rows } = await pool.query(query, params);
      return rows[0];
    },
    all: async (query, params = []) => {
      const { rows } = await pool.query(query, params);
      return rows;
    },
  };

  console.log('Connected to SQL database via DATABASE_URL');
} else {
  const APP_DB_PATH = path.join(__dirname, '../backend/app.db');
  const dbFile = fs.existsSync(APP_DB_PATH) ? APP_DB_PATH : APP_DB_PATH;
  const sqlite = new sqlite3.Database(dbFile, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('Connected to SQLite database at', dbFile);
    }
  });

  db = {
    run: (sql, params = []) =>
      new Promise((resolve, reject) => {
        sqlite.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }),
    get: (sql, params = []) =>
      new Promise((resolve, reject) => {
        sqlite.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
    all: (sql, params = []) =>
      new Promise((resolve, reject) => {
        sqlite.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
  };
}

module.exports = db;
