const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "workflow",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Enable promise wrapper separately
const promisePool = pool.promise();

console.log("MySQL Connected");

module.exports = {
  pool, // For old callback routes
  promisePool, // For async/await (chat, new features)
};
