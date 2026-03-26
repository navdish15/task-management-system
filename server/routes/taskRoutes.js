const express = require("express");
const router = express.Router();
const { pool: db } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/roleMiddleware");
const multer = require("multer");
const path = require("path");
const { createNotification } = require("../utils/notificationService");

/* ================= MULTER ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* ========================================================= */
/* ================= ADMIN: ASSIGN TASK ==================== */
/* ========================================================= */

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  upload.single("file"),
  async (req, res) => {
    try {
      const {
        employee_username,
        task_name,
        description,
        deadline,
        priority,
        project_id,
      } = req.body;

      const file = req.file ? req.file.filename : null;

      if (!project_id) {
        return res.status(400).json({
          message: "Project ID is required",
        });
      }

      if (!employee_username || !task_name) {
        return res.status(400).json({ message: "Missing fields" });
      }

      await db.query(
        `INSERT INTO tasks 
        (employee_username, task_name, description, deadline, priority, status, uploaded_file, project_id)
        VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)`,
        [
          employee_username,
          task_name,
          description,
          deadline,
          priority,
          file,
          project_id,
        ],
      );

      /* 🔔 NOTIFICATION */
      const [user] = await db.query("SELECT id FROM users WHERE username = ?", [
        employee_username,
      ]);

      if (user.length) {
        await createNotification(
          user[0].id,
          `New task "${task_name}" assigned to you`,
        );
      }

      res.json({ message: "Task assigned successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

/* ========================================================= */
/* ================= ADMIN: APPROVE TASK =================== */
/* ========================================================= */

router.put(
  "/admin/approve/:taskId",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { taskId } = req.params;

    try {
      await db.query("UPDATE tasks SET status = 'Completed' WHERE id = ?", [
        taskId,
      ]);

      const [task] = await db.query(
        "SELECT project_id, employee_username FROM tasks WHERE id = ?",
        [taskId],
      );

      if (!task.length) {
        return res.status(404).json({ message: "Task not found" });
      }

      const projectId = task[0].project_id;
      const empUsername = task[0].employee_username;

      const [tasks] = await db.query(
        "SELECT status FROM tasks WHERE project_id = ?",
        [projectId],
      );

      const allCompleted = tasks.every((t) => t.status === "Completed");

      const anyStarted = tasks.some(
        (t) =>
          t.status === "In Progress" ||
          t.status === "Submitted" ||
          t.status === "Completed",
      );

      let projectStatus = "Pending";

      if (allCompleted) projectStatus = "Completed";
      else if (anyStarted) projectStatus = "In Progress";

      await db.query("UPDATE projects SET status = ? WHERE id = ?", [
        projectStatus,
        projectId,
      ]);

      /* 🔔 NOTIFICATION (Employee) */
      const [user] = await db.query("SELECT id FROM users WHERE username = ?", [
        empUsername,
      ]);

      if (user.length) {
        await createNotification(
          user[0].id,
          `Your task (ID: ${taskId}) has been approved ✅`,
        );
      }

      res.json({
        message: "Task approved + project updated",
        projectStatus,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

/* ========================================================= */
/* ================= ADMIN: REJECT TASK ==================== */
/* ========================================================= */

router.put(
  "/admin/reject/:taskId",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { taskId } = req.params;

    try {
      await db.query("UPDATE tasks SET status = 'In Progress' WHERE id = ?", [
        taskId,
      ]);

      const [task] = await db.query(
        "SELECT employee_username FROM tasks WHERE id = ?",
        [taskId],
      );

      if (task.length) {
        const [user] = await db.query(
          "SELECT id FROM users WHERE username = ?",
          [task[0].employee_username],
        );

        if (user.length) {
          await createNotification(
            user[0].id,
            `Your task (ID: ${taskId}) was rejected ❌`,
          );
        }
      }

      res.json({ message: "Task rejected" });
    } catch (err) {
      res.status(500).json({ message: "Error rejecting task" });
    }
  },
);

/* ========================================================= */
/* ================= EMPLOYEE: SUBMIT WORK ================= */
/* ========================================================= */

router.post(
  "/employee/submit/:id",
  verifyToken,
  authorizeRoles("employee"),
  upload.single("file"),
  async (req, res) => {
    try {
      const taskId = req.params.id;
      const username = req.user.username;

      const file = req.file ? req.file.filename : null;
      const text = req.body.text || null;

      if (!file && !text) {
        return res.status(400).json({ message: "No submission" });
      }

      await db.query(
        `UPDATE tasks 
        SET submitted_file=?, submission_text=?, status='Submitted'
        WHERE id=? AND employee_username=?`,
        [file, text, taskId, username],
      );

      /* 🔔 NOTIFICATION (Admin) */
      const [admin] = await db.query(
        "SELECT id FROM users WHERE role = 'admin' LIMIT 1",
      );

      if (admin.length) {
        await createNotification(
          admin[0].id,
          `Employee ${username} submitted work for task ID ${taskId}`,
        );
      }

      res.json({ message: "Submitted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

/* ========================================================= */
/* ================= ADMIN: GET NORMAL TASKS =============== */
/* ========================================================= */

router.get(
  "/admin/all-normal-tasks",
  verifyToken,
  authorizeRoles("admin"),
  (req, res) => {
    db.query(
      "SELECT * FROM tasks WHERE project_id IS NULL ORDER BY deadline ASC",
      (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
      },
    );
  },
);

module.exports = router;
