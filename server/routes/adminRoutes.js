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
      if (err) {
        console.error("DB ERROR:", err);
        reject(err);
      } else resolve(result);
    });
  });

/* ================= HELPERS ================= */

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
        totalTasks: totalTasks[0].total || 0,
        pendingTasks: pendingTasks[0].total || 0,
        completedTasks: completedTasks[0].total || 0,
        totalEmployees: employees[0].total || 0,
      });
    } catch (err) {
      console.error("Dashboard error:", err);
      res.status(500).json({ message: "Dashboard error" });
    }
  },
);

/* ================= USERS ================= */

router.get("/users", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    let sql = "SELECT id, username, email, role, department, status FROM users";
    let params = [];

    if (search) {
      sql += " WHERE username LIKE ? OR email LIKE ?";
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result);
  } catch (err) {
    console.error("Users fetch error:", err);
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

      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

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
      console.error("Create user error:", err);
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

      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // 🔥 Duplicate email check (exclude current user)
      const existing = await query(
        "SELECT id FROM users WHERE email=? AND id != ?",
        [email, userId],
      );

      if (existing.length > 0) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const result = await query(
        `UPDATE users SET username=?, email=?, role=?, department=?, status=? WHERE id=?`,
        [username, email, role, department, status, userId],
      );

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
      console.error("Update user error:", err);
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
      console.error("Delete user error:", err);
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
      console.error("Toggle status error:", err);
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
      console.error("Employees fetch error:", err);
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
      console.error("Analytics error:", err);
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
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const result = await query(
        `SELECT id, action, performed_by, role, created_at 
         FROM audit_logs 
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset],
      );

      res.json(result);
    } catch (err) {
      console.error("Audit logs error:", err);
      res.status(500).json({ message: "Error fetching logs" });
    }
  },
);

module.exports = router;
