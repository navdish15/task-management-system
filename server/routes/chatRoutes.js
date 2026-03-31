const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const chatController = require("../controllers/chatController");
const { promisePool: db } = require("../config/db");
const upload = require("../middleware/upload");

/* ===== GET USERS FOR CHAT (ROLE BASED) ===== */
router.get("/users", verifyToken, async (req, res) => {
  try {
    const role = req.user.role;

    let query = `
      SELECT id, username, name, role 
      FROM users 
      WHERE status='active'
    `;

    // ✅ employees only see admins
    if (role !== "admin") {
      query += " AND role = 'admin'";
    }

    const [users] = await db.query(query);

    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===== GET PROJECT CHATS ===== */
router.get("/projects", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [projects] = await db.query(
      `
      SELECT 
        c.id AS chat_id,
        p.project_name
      FROM chats c
      JOIN projects p ON p.id = c.project_id
      JOIN chat_members cm ON cm.chat_id = c.id
      WHERE c.type = 'project'
      AND cm.user_id = ?
      ORDER BY p.project_name ASC
      `,
      [userId],
    );

    res.json(projects);
  } catch (err) {
    console.error("Project chat fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===== CREATE OR GET PRIVATE CHAT ===== */
router.post("/private", verifyToken, chatController.getOrCreatePrivateChat);

/* ===== GET USER CHATS ===== */
router.get("/my-chats", verifyToken, chatController.getUserChats);

/* ===== GET MESSAGES ===== */
router.get("/messages/:chatId", verifyToken, chatController.getMessages);

/* ===== SEND MESSAGE (REST fallback) ===== */
router.post("/send", verifyToken, chatController.sendMessage);

/* ===== UPLOAD FILE ===== */
router.post("/upload", verifyToken, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const baseUrl = process.env.BASE_URL || "http://localhost:5000";

    res.json({
      fileUrl: `${baseUrl}/uploads/chat/${req.file.filename}`,
      fileName: req.file.originalname,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

/* ================= MESSAGE ACTIONS ================= */

/* ===== EDIT MESSAGE ===== */
router.put("/message/:id", verifyToken, chatController.editMessage);

/* ===== DELETE MESSAGE ===== */
router.delete("/message/:id", verifyToken, chatController.deleteMessage);

module.exports = router;
