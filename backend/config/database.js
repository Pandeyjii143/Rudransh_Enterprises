const path = require('path');
const fs = require('fs');

// Prefer environment URL for production database providers (PostgreSQL / MySQL)
// If no DATABASE_URL is configured, use local SQLite data (development).
const { DATABASE_URL } = process.env;

if (!fs.existsSync(path.join(__dirname, '..', 'app.db'))) {
  fs.writeFileSync(path.join(__dirname, '..', 'app.db'), '');
}

const dbConnector = require('../../database/db');

/**
 * For legacy support, we expose same interface used by existing code.
 * - db is for callbacks style
 * - dbAsync is for Promise style from existing services.
 */

let db, dbAsync;

if (DATABASE_URL) {
  db = {
    query: async (sql, params = []) => dbConnector.query(sql, params),
  };

  dbAsync = {
    run: async (sql, params = []) => {
      const res = await dbConnector.query(sql, params);
      return { lastID: res.rows?.[0]?.id || null, changes: res.rowCount };
    },
    get: (sql, params = []) => dbConnector.get(sql, params),
    all: (sql, params = []) => dbConnector.all(sql, params),
  };
} else {
  db = dbConnector;
  dbAsync = dbConnector;
}

module.exports = { db, dbAsync };

