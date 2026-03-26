const express = require("express");
const router = express.Router();
const { pool: db } = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

/* =====================================================
   1️⃣ CREATE PROJECT (Admin Only)
===================================================== */
router.post("/create", verifyToken, (req, res) => {
  const { project_name, description, start_date, due_date, members } = req.body;
  const adminId = req.user.id;
  const role = req.user.role?.toLowerCase();

  if (role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  if (!project_name || !description || !start_date || !due_date) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ message: "At least one member required" });
  }

  db.query(
    `INSERT INTO projects 
     (project_name, description, start_date, due_date, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [project_name, description, start_date, due_date, adminId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Insert failed" });

      const projectId = result.insertId;
      const values = members.map((m) => [projectId, m]);

      db.query(
        `INSERT INTO project_members (project_id, employee_id) VALUES ?`,
        [values],
        () => res.json({ message: "Project created", projectId }),
      );
    },
  );
});

/* =====================================================
   2️⃣ GET ALL PROJECTS (FIXED 🔥)
===================================================== */
router.get("/", verifyToken, (req, res) => {
  const userId = req.user.id;
  const role = req.user.role?.toLowerCase();

  let query;
  let params = [];

  if (role === "admin") {
    query = `
      SELECT 
        p.*,
        COUNT(t.id) AS totalTasks,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completedTasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
  } else {
    query = `
      SELECT 
        p.*,
        COUNT(t.id) AS totalTasks,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completedTasks
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE pm.employee_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    params = [userId];
  }

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });

    const updated = results.map((p) => {
      const total = p.totalTasks || 0;
      const completed = p.completedTasks || 0;

      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        ...p,
        status: p.status, // ✅ FIXED: use DB status only
        progress,
      };
    });

    res.json(updated);
  });
});

/* =====================================================
   3️⃣ GET SINGLE PROJECT DETAILS (ALREADY CORRECT)
===================================================== */
router.get("/:id", verifyToken, (req, res) => {
  const projectId = req.params.id;

  const projectQuery = `
    SELECT p.*, u.name AS created_by_name
    FROM projects p
    JOIN users u ON p.created_by = u.id
    WHERE p.id = ?
  `;

  db.query(projectQuery, [projectId], (err, projectResult) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (!projectResult.length)
      return res.status(404).json({ message: "Not found" });

    db.query(
      `SELECT u.id, u.name FROM project_members pm
       JOIN users u ON pm.employee_id = u.id
       WHERE pm.project_id = ?`,
      [projectId],
      (err, members) => {
        if (err) return res.status(500).json({ message: "Server error" });

        db.query(
          `SELECT * FROM tasks WHERE project_id = ?`,
          [projectId],
          (err, tasks) => {
            if (err) return res.status(500).json({ message: "Server error" });

            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(
              (t) => t.status === "Completed",
            ).length;

            const progress =
              totalTasks === 0
                ? 0
                : Math.round((completedTasks / totalTasks) * 100);

            let status = "Pending";
            if (completedTasks === totalTasks && totalTasks > 0)
              status = "Completed";
            else if (completedTasks > 0) status = "In Progress";

            res.json({
              project: {
                ...projectResult[0],
                status,
              },
              members,
              tasks,
              stats: {
                totalTasks,
                completedTasks,
                progress,
              },
            });
          },
        );
      },
    );
  });
});

/* =====================================================
   4️⃣ UPDATE PROJECT
===================================================== */
router.put("/:id", verifyToken, (req, res) => {
  const projectId = req.params.id;
  const { project_name, description, start_date, due_date, members } = req.body;

  db.query(
    `UPDATE projects 
     SET project_name=?, description=?, start_date=?, due_date=? 
     WHERE id=?`,
    [project_name, description, start_date, due_date, projectId],
    () => {
      db.query(`DELETE FROM project_members WHERE project_id=?`, [projectId]);

      const values = members.map((m) => [projectId, m]);

      db.query(
        `INSERT INTO project_members (project_id, employee_id) VALUES ?`,
        [values],
        () => res.json({ message: "Updated" }),
      );
    },
  );
});

/* =====================================================
   5️⃣ DELETE PROJECT
===================================================== */
router.delete("/:id", verifyToken, (req, res) => {
  db.query("DELETE FROM projects WHERE id=?", [req.params.id], () => {
    res.json({ message: "Deleted" });
  });
});

module.exports = router;
