const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbFile = path.join(__dirname, '..', 'db.js');
const db = require(dbFile);
const seedSql = fs.readFileSync(path.join(__dirname, '..', 'seed', 'seed.sql'), 'utf8');

(async () => {
  try {
    if (process.env.DATABASE_URL) {
      await db.query(seedSql);
   } else {
      const sqlite3 = require('sqlite3').verbose();
      const sqlite = new sqlite3.Database(path.join(__dirname, '..', '..', 'backend', 'app.db'));
      sqlite.exec(seedSql, (err) => {
        if (err) {
          console.error('Seed error', err);
          process.exit(1);
        }
        console.log('Seed inserted.');
        sqlite.close();
      });
    }

    console.log('Seed script completed.');
  } catch (error) {
    console.error('Unable to seed database', error);
    process.exit(1);
  }
})();