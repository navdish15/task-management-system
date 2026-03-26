const { promisePool: db } = require("../config/db");

/* ================= CREATE OR GET PRIVATE CHAT ================= */

exports.getOrCreatePrivateChat = async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user.id;

  try {
    const [existing] = await db.query(
      `
      SELECT c.id FROM chats c
      JOIN chat_members m1 ON c.id = m1.chat_id
      JOIN chat_members m2 ON c.id = m2.chat_id
      WHERE c.type = 'private'
      AND m1.user_id = ?
      AND m2.user_id = ?
    `,
      [senderId, receiverId],
    );

    if (existing.length > 0) {
      return res.json({ chatId: existing[0].id });
    }

    const [chat] = await db.query(
      "INSERT INTO chats (type) VALUES ('private')",
    );

    const chatId = chat.insertId;

    await db.query(
      "INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?), (?, ?)",
      [chatId, senderId, chatId, receiverId],
    );

    res.json({ chatId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET USER CHATS ================= */

exports.getUserChats = async (req, res) => {
  const userId = req.user.id;

  try {
    const [chats] = await db.query(
      `
      SELECT c.id, c.type, c.created_at
      FROM chats c
      JOIN chat_members cm ON c.id = cm.chat_id
      WHERE cm.user_id = ?
    `,
      [userId],
    );

    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET MESSAGES ================= */

exports.getMessages = async (req, res) => {
  const { chatId } = req.params;

  try {
    const [messages] = await db.query(
      `
      SELECT m.*, u.name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = ?
      ORDER BY m.created_at ASC
    `,
      [chatId],
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= SEND MESSAGE (REST BACKUP) ================= */

exports.sendMessage = async (req, res) => {
  const { chatId, message } = req.body;
  const senderId = req.user.id;

  try {
    await db.query(
      "INSERT INTO messages (chat_id, sender_id, message) VALUES (?, ?, ?)",
      [chatId, senderId, message],
    );

    res.json({ message: "Message sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= EDIT MESSAGE ================= */

exports.editMessage = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  try {
    // Check if message belongs to current user
    const [existing] = await db.query(
      "SELECT * FROM messages WHERE id = ? AND sender_id = ?",
      [id, userId],
    );

    if (existing.length === 0) {
      return res.status(403).json({
        message: "Not allowed to edit this message",
      });
    }

    await db.query("UPDATE messages SET message = ? WHERE id = ?", [
      message,
      id,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("Edit message error:", err);
    res.status(500).json({ message: "Edit failed" });
  }
};

/* ================= DELETE MESSAGE ================= */

exports.deleteMessage = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Check ownership
    const [existing] = await db.query(
      "SELECT * FROM messages WHERE id = ? AND sender_id = ?",
      [id, userId],
    );

    if (existing.length === 0) {
      return res.status(403).json({
        message: "Not allowed to delete this message",
      });
    }

    await db.query("DELETE FROM messages WHERE id = ?", [id]);

    res.json({ success: true });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ message: "Delete failed" });
  }
};
