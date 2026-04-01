const express = require("express");
const router = express.Router();
const { pool: db } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

/* ================= GET USER NOTIFICATIONS ================= */
router.get("/", verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
    (err, results) => {
      if (err) {
        console.error("Fetch notifications error:", err);
        return res.status(500).json({ message: "Server error" });
      }
      res.json(results);
    },
  );
});

/* ================= MARK ONE AS READ ================= */
router.put("/read/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.query(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
    [id, userId],
    (err, result) => {
      if (err) {
        console.error("Mark read error:", err);
        return res.status(500).json({ message: "Server error" });
      }

      if (result.affectedRows === 0) {
        return res.status(403).json({ message: "Not allowed" });
      }

      res.json({ message: "Notification marked as read" });
    },
  );
});

/* ================= MARK ALL AS READ ================= */
router.put("/read-all", verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(
    "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
    [userId],
    (err) => {
      if (err) {
        console.error("Mark all read error:", err);
        return res.status(500).json({ message: "Server error" });
      }

      res.json({ message: "All notifications marked as read" });
    },
  );
});

module.exports = router;
