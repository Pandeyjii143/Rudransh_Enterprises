const dbConnector = require('../../database/db');

/**
 * For legacy support, we expose same interface used by existing code.
 * - db is for callbacks style
 * - dbAsync is for Promise style from existing services.
 */

const db = dbConnector;
const dbAsync = dbConnector;

module.exports = { db, dbAsync };
    },
    get: (sql, params = []) => dbConnector.get(sql, params),
    all: (sql, params = []) => dbConnector.all(sql, params),
  };
} else {
  db = dbConnector;
  dbAsync = dbConnector;
}

module.exports = { db, dbAsync };

