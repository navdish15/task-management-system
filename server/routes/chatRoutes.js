const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const chatController = require("../controllers/chatController");
const { promisePool: db } = require("../config/db");
const upload = require("../middleware/upload");

/* ================= CONFIG ================= */

const BASE_URL = process.env.BASE_URL;
if (!BASE_URL) {
  console.warn("⚠ BASE_URL is not set in environment variables");
}

/* ===== GET USERS FOR CHAT (ROLE BASED) ===== */
router.get("/users", verifyToken, async (req, res) => {
  try {
    const role = req.user.role;

    let sql = `
      SELECT id, username, name, role 
      FROM users 
      WHERE status='active'
    `;

    if (role !== "admin") {
      sql += " AND role = 'admin'";
    }

    const [users] = await db.query(sql);

    res.json(users || []);
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

    res.json(projects || []);
  } catch (err) {
    console.error("Project chat fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===== CREATE OR GET PRIVATE CHAT ===== */
router.post("/private", verifyToken, chatController.getOrCreatePrivateChat);

/* ===== GET USER CHATS ===== */
router.get("/my-chats", verifyToken, chatController.getUserChats);

/* ===== GET MESSAGES (WITH ACCESS CONTROL) ===== */
router.get(
  "/messages/:chatId",
  verifyToken,
  async (req, res, next) => {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;

      const [access] = await db.query(
        "SELECT 1 FROM chat_members WHERE chat_id=? AND user_id=?",
        [chatId, userId],
      );

      if (access.length === 0) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (err) {
      console.error("Chat access error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
  chatController.getMessages,
);

/* ===== SEND MESSAGE ===== */
router.post("/send", verifyToken, chatController.sendMessage);

/* ===== UPLOAD FILE ===== */
router.post(
  "/upload",
  verifyToken,
  (req, res, next) => {
    upload.single("file")(req, res, function (err) {
      if (err) {
        console.error("Upload middleware error:", err.message);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (!BASE_URL) {
        return res.status(500).json({
          message: "BASE_URL not configured",
        });
      }

      res.json({
        fileUrl: `${BASE_URL}/uploads/chat/${req.file.filename}`,
        fileName: req.file.originalname,
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  },
);

/* ================= MESSAGE ACTIONS ================= */

/* ===== EDIT MESSAGE ===== */
router.put("/message/:id", verifyToken, chatController.editMessage);

/* ===== DELETE MESSAGE ===== */
router.delete("/message/:id", verifyToken, chatController.deleteMessage);

module.exports = router;
