const express = require("express");
const router = express.Router();
const { pool: db } = require("../config/db");

const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/roleMiddleware");
const logAction = require("../utils/auditLogger");

/* ================= DASHBOARD ================= */

router.get("/dashboard", verifyToken, authorizeRoles("admin"), (req, res) => {
  const totalTasksQuery = "SELECT COUNT(*) AS total FROM tasks";
  const pendingTasksQuery =
    "SELECT COUNT(*) AS total FROM tasks WHERE status='Pending'";
  const completedTasksQuery =
    "SELECT COUNT(*) AS total FROM tasks WHERE status='Completed'";
  const totalEmployeesQuery =
    "SELECT COUNT(*) AS total FROM users WHERE role='employee'";

  db.query(totalTasksQuery, (err, totalTasksResult) => {
    if (err) return res.status(500).json(err);

    db.query(pendingTasksQuery, (err, pendingTasksResult) => {
      if (err) return res.status(500).json(err);

      db.query(completedTasksQuery, (err, completedTasksResult) => {
        if (err) return res.status(500).json(err);

        db.query(totalEmployeesQuery, (err, totalEmployeesResult) => {
          if (err) return res.status(500).json(err);

          res.json({
            totalTasks: totalTasksResult[0].total,
            pendingTasks: pendingTasksResult[0].total,
            completedTasks: completedTasksResult[0].total,
            totalEmployees: totalEmployeesResult[0].total,
          });
        });
      });
    });
  });
});

/* ================= USERS ================= */

router.get("/users", verifyToken, authorizeRoles("admin"), (req, res) => {
  const search = req.query.search || "";
  let sql = "SELECT id, username, email, role, department, status FROM users";

  if (search) {
    sql += " WHERE username LIKE ? OR email LIKE ?";
  }

  db.query(sql, search ? [`%${search}%`, `%${search}%`] : [], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

/* CREATE USER */
router.post("/users", verifyToken, authorizeRoles("admin"), (req, res) => {
  const { username, email, password, role, department, status } = req.body;

  const sql =
    "INSERT INTO users (username, email, password, role, department, status) VALUES (?, ?, ?, ?, ?, ?)";

  db.query(
    sql,
    [username, email, password, role, department, status],
    (err) => {
      if (err) return res.status(500).json(err);

      logAction(`Created user ${username}`, req.user.username, req.user.role);

      res.json({ message: "User created successfully" });
    },
  );
});

/* UPDATE USER */
router.put("/users/:id", verifyToken, authorizeRoles("admin"), (req, res) => {
  const { username, email, role, department, status } = req.body;
  const userId = req.params.id;

  const sql = `
      UPDATE users 
      SET username=?, email=?, role=?, department=?, status=? 
      WHERE id=?
    `;

  db.query(sql, [username, email, role, department, status, userId], (err) => {
    if (err) return res.status(500).json(err);

    logAction(`Updated user ID ${userId}`, req.user.username, req.user.role);

    res.json({ message: "User updated successfully" });
  });
});

/* DELETE USER */
router.delete(
  "/users/:id",
  verifyToken,
  authorizeRoles("admin"),
  (req, res) => {
    db.query("DELETE FROM users WHERE id=?", [req.params.id], (err) => {
      if (err) return res.status(500).json(err);

      logAction(
        `Deleted user with ID ${req.params.id}`,
        req.user.username,
        req.user.role,
      );

      res.json({ message: "User deleted successfully" });
    });
  },
);

/* TOGGLE STATUS */
router.put(
  "/users/toggle/:id",
  verifyToken,
  authorizeRoles("admin"),
  (req, res) => {
    const userId = req.params.id;

    db.query("SELECT status FROM users WHERE id=?", [userId], (err, result) => {
      if (err) return res.status(500).json(err);
      if (!result.length)
        return res.status(404).json({ message: "User not found" });

      const newStatus = result[0].status === "active" ? "inactive" : "active";

      db.query(
        "UPDATE users SET status=? WHERE id=?",
        [newStatus, userId],
        (err) => {
          if (err) return res.status(500).json(err);

          logAction(
            `Toggled status for user ID ${userId}`,
            req.user.username,
            req.user.role,
          );

          res.json({ message: "Status updated" });
        },
      );
    });
  },
);

/* ================= EMPLOYEES ================= */

router.get("/employees", verifyToken, authorizeRoles("admin"), (req, res) => {
  db.query(
    "SELECT id, username FROM users WHERE role='employee'",
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    },
  );
});

/* ================= ANALYTICS ================= */

router.get("/analytics", verifyToken, authorizeRoles("admin"), (req, res) => {
  const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM tasks 
      GROUP BY status
    `;

  const monthlyQuery = `
      SELECT 
        DATE_FORMAT(assigned_at, '%Y-%m') as month,
        COUNT(*) as assigned,
        SUM(
          CASE 
            WHEN status = 'Completed' OR status = 'Approved' 
            THEN 1 ELSE 0 
          END
        ) as completed
      FROM tasks
      GROUP BY month
      ORDER BY month ASC
    `;

  const upcomingQuery = `
      SELECT task_name, employee_username, deadline
      FROM tasks
      WHERE deadline >= NOW()
      ORDER BY deadline ASC
      LIMIT 5
    `;

  const topEmployeeQuery = `
      SELECT employee_username, COUNT(*) as completed
      FROM tasks
      WHERE status = 'Completed'
      GROUP BY employee_username
      ORDER BY completed DESC
      LIMIT 1
    `;

  const overdueQuery = `
      SELECT task_name, employee_username, deadline
      FROM tasks
      WHERE deadline < NOW() AND status != 'Completed'
      ORDER BY deadline ASC
    `;

  const projectStatsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status != 'Completed' THEN 1 ELSE 0 END) as active
      FROM projects
    `;

  const employeePerformanceQuery = `
      SELECT 
        employee_username,
        COUNT(*) as assigned,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
      FROM tasks
      GROUP BY employee_username
    `;

  db.query(statusQuery, (err1, statusResult) => {
    if (err1) return res.status(500).json(err1);

    db.query(monthlyQuery, (err2, monthlyResult) => {
      if (err2) return res.status(500).json(err2);

      db.query(upcomingQuery, (err3, upcomingResult) => {
        if (err3) return res.status(500).json(err3);

        db.query(topEmployeeQuery, (err4, topResult) => {
          if (err4) return res.status(500).json(err4);

          db.query(overdueQuery, (err5, overdueResult) => {
            if (err5) return res.status(500).json(err5);

            db.query(projectStatsQuery, (err6, projectStatsResult) => {
              if (err6) return res.status(500).json(err6);

              db.query(employeePerformanceQuery, (err7, empResult) => {
                if (err7) return res.status(500).json(err7);

                res.json({
                  statusData: statusResult,
                  monthlyData: monthlyResult,
                  upcomingTasks: upcomingResult,
                  topEmployee: topResult[0] || null,
                  overdueTasks: overdueResult,
                  projectStats: projectStatsResult[0] || {},
                  employeePerformance: empResult,
                });
              });
            });
          });
        });
      });
    });
  });
});

/* ================= AUDIT LOGS (🔥 ADDED) ================= */

router.get("/audit-logs", verifyToken, authorizeRoles("admin"), (req, res) => {
  db.query(
    `SELECT id, action, performed_by, role, created_at 
     FROM audit_logs 
     ORDER BY created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error fetching logs" });
      res.json(results);
    },
  );
});

module.exports = router;
