const express = require("express");
const router = express.Router();
const { pool: db } = require("../config/db");

const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/roleMiddleware");

/* ================= DASHBOARD ================= */

router.get(
  "/dashboard",
  verifyToken,
  authorizeRoles("employee"),
  async (req, res) => {
    try {
      const username = req.user.username;

      const queries = [
        "SELECT COUNT(*) AS total FROM tasks WHERE employee_username=?",
        "SELECT COUNT(*) AS total FROM tasks WHERE employee_username=? AND status='Pending'",
        "SELECT COUNT(*) AS total FROM tasks WHERE employee_username=? AND status='Completed'",
      ];

      const results = await Promise.all(
        queries.map(
          (q) =>
            new Promise((resolve, reject) => {
              db.query(q, [username], (err, result) => {
                if (err) reject(err);
                else resolve(result[0].total);
              });
            }),
        ),
      );

      res.json({
        totalTasks: results[0],
        pendingTasks: results[1],
        completedTasks: results[2],
      });
    } catch (err) {
      console.error("Dashboard error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

/* ================= MY TASKS ================= */

router.get("/tasks", verifyToken, authorizeRoles("employee"), (req, res) => {
  const username = req.user.username;

  const sql = `
    SELECT id, task_name, description, deadline, priority, status
    FROM tasks
    WHERE employee_username=?
    ORDER BY deadline ASC
  `;

  db.query(sql, [username], (err, result) => {
    if (err) {
      console.error("Tasks fetch error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json(result);
  });
});

/* ================= UPDATE TASK STATUS ================= */

router.patch(
  "/tasks/status/:id",
  verifyToken,
  authorizeRoles("employee"),
  (req, res) => {
    const { status } = req.body;
    const taskId = req.params.id;
    const username = req.user.username;

    const allowedStatus = ["Pending", "In Progress", "Completed"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const sql = "UPDATE tasks SET status=? WHERE id=? AND employee_username=?";

    db.query(sql, [status, taskId, username], (err, result) => {
      if (err) {
        console.error("Update status error:", err);
        return res.status(500).json({ message: "Server error" });
      }

      if (result.affectedRows === 0) {
        return res
          .status(403)
          .json({ message: "Not allowed to update this task" });
      }

      res.json({ message: "Status updated successfully" });
    });
  },
);

/* ================= NOTIFICATIONS ================= */

router.get(
  "/notifications",
  verifyToken,
  authorizeRoles("employee"),
  (req, res) => {
    const username = req.user.username;

    db.query(
      "SELECT * FROM notification WHERE username=? ORDER BY id DESC",
      [username],
      (err, result) => {
        if (err) {
          console.error("Notifications fetch error:", err);
          return res.status(500).json({ message: "Server error" });
        }
        res.json(result);
      },
    );
  },
);

router.patch(
  "/notifications/read/:id",
  verifyToken,
  authorizeRoles("employee"),
  (req, res) => {
    const notificationId = req.params.id;
    const username = req.user.username;

    db.query(
      "UPDATE notification SET is_read=1 WHERE id=? AND username=?",
      [notificationId, username],
      (err) => {
        if (err) {
          console.error("Notification update error:", err);
          return res.status(500).json({ message: "Server error" });
        }
        res.json({ message: "Notification marked as read" });
      },
    );
  },
);

module.exports = router;
