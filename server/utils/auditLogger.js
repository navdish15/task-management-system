const { pool: db } = require("../config/db");

/* ================= AUDIT LOGGER ================= */

const logAction = (action, performedBy, role, req = null) => {
  try {
    if (!action || !performedBy || !role) {
      console.warn("⚠ Missing audit log fields");
      return;
    }

    console.log("AUDIT LOG CALLED:", action, performedBy, role);

    const sql =
      "INSERT INTO audit_logs (action, performed_by, role) VALUES (?, ?, ?)";

    db.query(sql, [action, performedBy, role], (err, result) => {
      if (err) {
        console.error("Audit log DB error:", err);
        return;
      }

      const newLog = {
        id: result.insertId,
        action,
        performed_by: performedBy,
        role,
        created_at: new Date(),
      };

      console.log("Audit log inserted successfully");

      /* ================= REAL-TIME EMIT ================= */

      try {
        if (req && req.app) {
          const io = req.app.get("io");

          if (io) {
            io.emit("new_log", newLog);
          }
        }
      } catch (socketErr) {
        console.error("Socket emit error:", socketErr);
      }
    });
  } catch (err) {
    console.error("Audit logger crash:", err);
  }
};

module.exports = logAction;
