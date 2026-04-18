const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'app.db');
const db = new sqlite3.Database(dbPath);

db.run("UPDATE users SET role_id = 1 WHERE email = 'pandeyravi2143@gmain.com'", function(err) {
  if (err) {
    console.error('Error updating user role:', err);
  } else {
    console.log('User role updated successfully');
  }
  db.close();
});