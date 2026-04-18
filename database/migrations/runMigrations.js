const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbFile = path.join(__dirname, '..', 'db.js');
const db = require(dbFile);
const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');

(async () => {
  try {
    if (process.env.DATABASE_URL) {
      await db.query(schema);
    } else {
      const sqlite3 = require('sqlite3').verbose();
      const sqlite = new sqlite3.Database(path.join(__dirname, '..', '..', 'backend', 'app.db'));
      sqlite.exec(schema, (err) => {
        if (err) {
          console.error('Migration error', err);
          process.exit(1);
        }
        console.log('Schema applied.');
        sqlite.close();
      });
    }
    console.log('Migrations completed.');
  } catch (error) {
    console.error('Unable to run migrations', error);
    process.exit(1);
  }
})();