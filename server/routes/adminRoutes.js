const express = require("express");
const router = express.Router();
const { pool: db } = require("../config/db");

const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/roleMiddleware");
const logAction = require("../utils/auditLogger");

/* ================= PROMISE WRAPPER ================= */

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

/* ================= DASHBOARD ================= */

router.get(
  "/dashboard",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const [totalTasks, pendingTasks, completedTasks, employees] =
        await Promise.all([
          query("SELECT COUNT(*) AS total FROM tasks"),
          query("SELECT COUNT(*) AS total FROM tasks WHERE status='Pending'"),
          query("SELECT COUNT(*) AS total FROM tasks WHERE status='Completed'"),
          query("SELECT COUNT(*) AS total FROM users WHERE role='employee'"),
        ]);

      res.json({
        totalTasks: totalTasks[0].total,
        pendingTasks: pendingTasks[0].total,
        completedTasks: completedTasks[0].total,
        totalEmployees: employees[0].total,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Dashboard error" });
    }
  },
);

/* ================= USERS ================= */

router.get("/users", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const search = req.query.search || "";
    let sql = "SELECT id, username, email, role, department, status FROM users";
    let params = [];

    if (search) {
      sql += " WHERE username LIKE ? OR email LIKE ?";
      params = [`%${search}%`, `%${search}%`];
    }

    const result = await query(sql, params);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

/* ================= CREATE USER ================= */

router.post(
  "/users",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { username, email, password, role, department, status } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields required" });
      }

      // 🔥 Duplicate email check
      const existing = await query("SELECT id FROM users WHERE email=?", [
        email,
      ]);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Email already exists" });
      }

      await query(
        "INSERT INTO users (username, email, password, role, department, status) VALUES (?, ?, ?, ?, ?, ?)",
        [username, email, password, role, department, status],
      );

      logAction(
        `Created user ${username}`,
        req.user.username,
        req.user.role,
        req,
      );

      res.json({ message: "User created successfully" });
    } catch (err) {
      res.status(500).json({ message: "Error creating user" });
    }
  },
);

/* ================= UPDATE USER ================= */

router.put(
  "/users/:id",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { username, email, role, department, status } = req.body;
      const userId = req.params.id;

      const result = await query(
        `UPDATE users SET username=?, email=?, role=?, department=?, status=? WHERE id=?`,
        [username, email, role, department, status, userId],
      );

      // 🔥 Check user exists
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      logAction(
        `Updated user ID ${userId}`,
        req.user.username,
        req.user.role,
        req,
      );

      res.json({ message: "User updated successfully" });
    } catch (err) {
      res.status(500).json({ message: "Error updating user" });
    }
  },
);

/* ================= DELETE USER ================= */

router.delete(
  "/users/:id",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await query("DELETE FROM users WHERE id=?", [
        req.params.id,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      logAction(
        `Deleted user ID ${req.params.id}`,
        req.user.username,
        req.user.role,
        req,
      );

      res.json({ message: "User deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Error deleting user" });
    }
  },
);

/* ================= TOGGLE STATUS ================= */

router.put(
  "/users/toggle/:id",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const userId = req.params.id;

      const result = await query(
        `UPDATE users 
       SET status = CASE 
         WHEN status = 'active' THEN 'inactive'
         ELSE 'active'
       END
       WHERE id=?`,
        [userId],
      );

      // 🔥 Check user exists
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      logAction(
        `Toggled status for user ID ${userId}`,
        req.user.username,
        req.user.role,
        req,
      );

      res.json({ message: "Status updated" });
    } catch (err) {
      res.status(500).json({ message: "Error updating status" });
    }
  },
);

/* ================= EMPLOYEES ================= */

router.get(
  "/employees",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await query(
        "SELECT id, username FROM users WHERE role='employee'",
      );
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Error fetching employees" });
    }
  },
);

/* ================= ANALYTICS ================= */

router.get(
  "/analytics",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const [
        statusResult,
        monthlyResult,
        upcomingResult,
        topResult,
        overdueResult,
        projectStatsResult,
        empResult,
      ] = await Promise.all([
        query(`SELECT status, COUNT(*) as count FROM tasks GROUP BY status`),

        query(`
        SELECT 
          DATE_FORMAT(assigned_at, '%Y-%m') as month,
          COUNT(*) as assigned,
          SUM(CASE WHEN status IN ('Completed','Approved') THEN 1 ELSE 0 END) as completed
        FROM tasks
        GROUP BY month
        ORDER BY month ASC
      `),

        query(`
        SELECT task_name, employee_username, deadline
        FROM tasks
        WHERE deadline >= NOW()
        ORDER BY deadline ASC
        LIMIT 5
      `),

        query(`
        SELECT employee_username, COUNT(*) as completed
        FROM tasks
        WHERE status = 'Completed'
        GROUP BY employee_username
        ORDER BY completed DESC
        LIMIT 1
      `),

        query(`
        SELECT task_name, employee_username, deadline
        FROM tasks
        WHERE deadline < NOW() AND status != 'Completed'
        ORDER BY deadline ASC
      `),

        query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status != 'Completed' THEN 1 ELSE 0 END) as active
        FROM projects
      `),

        query(`
        SELECT 
          employee_username,
          COUNT(*) as assigned,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
        FROM tasks
        GROUP BY employee_username
      `),
      ]);

      res.json({
        statusData: statusResult,
        monthlyData: monthlyResult,
        upcomingTasks: upcomingResult,
        topEmployee: topResult[0] || null,
        overdueTasks: overdueResult,
        projectStats: projectStatsResult[0] || {},
        employeePerformance: empResult,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Analytics error" });
    }
  },
);

/* ================= AUDIT LOGS ================= */

router.get(
  "/audit-logs",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await query(
        `SELECT id, action, performed_by, role, created_at 
       FROM audit_logs 
       ORDER BY created_at DESC`,
      );
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Error fetching logs" });
    }
  },
);

module.exports = router;
