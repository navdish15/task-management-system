const mysql = require("mysql2");

// 🔹 Create Connection Pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root", //
  database: "workflow",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 🔹 Promise Wrapper (for async/await)
const promisePool = pool.promise();

// 🔥 REAL CONNECTION TEST (IMPORTANT)
(async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log("✅ MySQL Connected Successfully");
    connection.release();
  } catch (err) {
    console.error("❌ MySQL Connection Failed:", err.message);

    // Extra Debug Info (helps in real projects)
    if (err.code === "ECONNREFUSED") {
      console.error("👉 MySQL server is not running");
    }
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("👉 Invalid username/password");
    }
    if (err.code === "ER_BAD_DB_ERROR") {
      console.error("👉 Database 'workflow' does not exist");
    }
  }
})();

module.exports = {
  pool,
  promisePool, // For async/await (recommended)
};
