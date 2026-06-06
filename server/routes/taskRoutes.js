const express = require("express");
const router = express.Router();
const { promisePool: db } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/roleMiddleware");
const multer = require("multer");
const path = require("path");
const { createNotification } = require("../utils/notificationService");

/* ================= MULTER (SECURE) ================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^\w.-]/g, "");
    cb(null, Date.now() + "-" + safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      // Images
      "image/jpeg",
      "image/png",
      "image/jpg",

      // PDF
      "application/pdf",

      // Word
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      // Excel
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      // PowerPoint
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",

      // Text
      "text/plain",

      // ZIP
      "application/zip",
      "application/x-zip-compressed",
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  },
});

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

      // Normal tasks can have project_id = null
      const finalProjectId = project_id || null;

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
          finalProjectId,
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
      console.error("Assign task error:", err);
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
      const [task] = await db.query(
        "SELECT project_id, employee_username FROM tasks WHERE id = ?",
        [taskId],
      );

      if (!task.length) {
        return res.status(404).json({ message: "Task not found" });
      }

      await db.query("UPDATE tasks SET status = 'Completed' WHERE id = ?", [
        taskId,
      ]);

      const projectId = task[0].project_id;

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

      /* 🔔 NOTIFY EMPLOYEE */
      const [user] = await db.query("SELECT id FROM users WHERE username = ?", [
        task[0].employee_username,
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
      console.error("Approve error:", err);
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
      const [task] = await db.query(
        "SELECT employee_username FROM tasks WHERE id = ?",
        [taskId],
      );

      if (!task.length) {
        return res.status(404).json({ message: "Task not found" });
      }

      await db.query("UPDATE tasks SET status = 'In Progress' WHERE id = ?", [
        taskId,
      ]);

      const [user] = await db.query("SELECT id FROM users WHERE username = ?", [
        task[0].employee_username,
      ]);

      if (user.length) {
        await createNotification(
          user[0].id,
          `Your task (ID: ${taskId}) was rejected ❌`,
        );
      }

      res.json({ message: "Task rejected" });
    } catch (err) {
      console.error("Reject error:", err);
      res.status(500).json({ message: "Server error" });
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
      console.log("========== SUBMIT DEBUG ==========");
      console.log("USER:", req.user);
      console.log("FILE:", req.file);
      console.log("BODY:", req.body);

      const taskId = req.params.id;

      const username = req.user.username || req.user.email || req.user.id;

      const file = req.file ? req.file.filename : null;
      const text = req.body.text || null;

      if (!file && !text) {
        return res.status(400).json({
          message: "No submission provided",
        });
      }

      const [result] = await db.query(
        `UPDATE tasks
         SET submitted_file = ?,
             submission_text = ?,
             status = 'Submitted'
         WHERE id = ? AND employee_username = ?`,
        [file, text, taskId, username],
      );

      console.log("UPDATE RESULT:", result);

      if (result.affectedRows === 0) {
        return res.status(403).json({
          message: "Not allowed or task not found",
        });
      }

      /* 🔔 NOTIFY ADMINS */
      const [admins] = await db.query(
        "SELECT id FROM users WHERE role = 'admin'",
      );

      for (const admin of admins) {
        await createNotification(
          admin.id,
          `Employee ${username} submitted work for task ID ${taskId}`,
        );
      }

      res.json({
        message: "Submitted successfully",
      });
    } catch (err) {
      console.error("===== SUBMISSION ERROR =====");
      console.error(err);

      res.status(500).json({
        message: err.message,
        error: err,
      });
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
  async (req, res) => {
    try {
      const [result] = await db.query(
        "SELECT * FROM tasks WHERE project_id IS NULL ORDER BY deadline ASC",
      );

      res.json(result);
    } catch (err) {
      console.error("Fetch normal tasks error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.put("/:id", verifyToken, async (req, res) => {
  const taskId = req.params.id;

  const { task_name, description, employee_username, priority, deadline } =
    req.body;

  const formattedDeadline = deadline
    ? new Date(deadline).toISOString().slice(0, 19).replace("T", " ")
    : null;

  try {
    await db.query(
      `UPDATE tasks
       SET task_name=?, description=?, employee_username=?, priority=?, deadline=?
       WHERE id=?`,
      [
        task_name,
        description,
        employee_username,
        priority,
        formattedDeadline,
        taskId,
      ],
    );

    res.json({ message: "Task updated successfully" });
  } catch (err) {
    console.error("SQL ERROR:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

/* ========================================================= */
/* ================= ADMIN: DELETE TASK ==================== */
/* ========================================================= */

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const taskId = req.params.id;

    const [result] = await db.query("DELETE FROM tasks WHERE id = ?", [taskId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
