const { pool: db } = require("../config/db");
const logAction = (action, performedBy, role) => {
  console.log("AUDIT LOG CALLED:", action, performedBy, role);

  const sql =
    "INSERT INTO audit_logs (action, performed_by, role) VALUES (?, ?, ?)";

  db.query(sql, [action, performedBy, role], (err) => {
    if (err) {
      console.error("Audit log error:", err);
    } else {
      console.log("Audit log inserted successfully");
    }
  });
};

module.exports = logAction;
