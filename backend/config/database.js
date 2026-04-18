const dbConnector = require('../../database/db');

/**
 * For legacy support, expose the same interface used by existing code.
 * - db is for callback-style or direct access
 * - dbAsync is for promise-style usage in modern services.
 */

const db = dbConnector;
const dbAsync = {
  run: async (sql, params = []) => dbConnector.run(sql, params),
  get: async (sql, params = []) => dbConnector.get(sql, params),
  all: async (sql, params = []) => dbConnector.all(sql, params),
};

module.exports = { db, dbAsync };

