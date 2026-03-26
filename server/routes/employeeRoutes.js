const express = require("express");
const router = express.Router();
const { pool: db } = require("../config/db");

const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/roleMiddleware");

/* ================= EMPLOYEE DASHBOARD ================= */

router.get(
  "/dashboard",
  verifyToken,
  authorizeRoles("employee"),
  (req, res) => {
    const username = req.user.username; // must be inside JWT

    const totalQuery =
      "SELECT COUNT(*) AS total FROM tasks WHERE employee_username=?";
    const pendingQuery =
      "SELECT COUNT(*) AS total FROM tasks WHERE employee_username=? AND status='Pending'";
    const completedQuery =
      "SELECT COUNT(*) AS total FROM tasks WHERE employee_username=? AND status='Completed'";

    db.query(totalQuery, [username], (err, totalResult) => {
      if (err) return res.status(500).json(err);

      db.query(pendingQuery, [username], (err, pendingResult) => {
        if (err) return res.status(500).json(err);

        db.query(completedQuery, [username], (err, completedResult) => {
          if (err) return res.status(500).json(err);

          res.json({
            totalTasks: totalResult[0].total,
            pendingTasks: pendingResult[0].total,
            completedTasks: completedResult[0].total,
          });
        });
      });
    });
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
    if (err) return res.status(500).json(err);
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

    const sql = "UPDATE tasks SET status=? WHERE id=? AND employee_username=?";

    db.query(sql, [status, taskId, username], (err, result) => {
      if (err) return res.status(500).json(err);

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
        if (err) return res.status(500).json(err);
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
        if (err) return res.status(500).json(err);
        res.json({ message: "Notification marked as read" });
      },
    );
  },
);

module.exports = router;
