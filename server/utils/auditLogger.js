const { pool: db } = require("../config/db");

const logAction = (action, performedBy, role, req = null) => {
  console.log("AUDIT LOG CALLED:", action, performedBy, role);

  const sql =
    "INSERT INTO audit_logs (action, performed_by, role) VALUES (?, ?, ?)";

  db.query(sql, [action, performedBy, role], (err, result) => {
    if (err) {
      console.error("Audit log error:", err);
    } else {
      console.log("Audit log inserted successfully");

      const newLog = {
        id: result.insertId,
        action,
        performed_by: performedBy,
        role,
        created_at: new Date(),
      };

      // 🔥 REAL-TIME EMIT
      if (req) {
        const io = req.app.get("io");
        if (io) {
          io.emit("new_log", newLog);
        }
      }
    }
  });
};

module.exports = logAction;
