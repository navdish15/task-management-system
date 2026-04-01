const { promisePool: db } = require("../config/db");

/* ================= CREATE OR GET PRIVATE CHAT ================= */

exports.getOrCreatePrivateChat = async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user.id;

  if (!receiverId) {
    return res.status(400).json({ message: "Receiver required" });
  }

  try {
    // Check existing chat
    const [existing] = await db.query(
      `
      SELECT c.id FROM chats c
      JOIN chat_members m1 ON c.id = m1.chat_id
      JOIN chat_members m2 ON c.id = m2.chat_id
      WHERE c.type = 'private'
      AND m1.user_id = ?
      AND m2.user_id = ?
      LIMIT 1
    `,
      [senderId, receiverId],
    );

    if (existing.length > 0) {
      return res.json({ chatId: existing[0].id });
    }

    // Create chat
    const [chat] = await db.query(
      "INSERT INTO chats (type) VALUES ('private')",
    );

    const chatId = chat.insertId;

    // Add members (UNIQUE constraint prevents duplicates)
    await db.query(
      "INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?), (?, ?)",
      [chatId, senderId, chatId, receiverId],
    );

    res.json({ chatId });
  } catch (err) {
    console.error("Create chat error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET USER CHATS (WITH LAST MESSAGE) ================= */

exports.getUserChats = async (req, res) => {
  const userId = req.user.id;

  try {
    const [chats] = await db.query(
      `
      SELECT 
        c.id,
        c.type,
        c.created_at,

        -- Last message
        (
          SELECT m.message 
          FROM messages m 
          WHERE m.chat_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) AS lastMessage,

        -- Last message time
        (
          SELECT m.created_at 
          FROM messages m 
          WHERE m.chat_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) AS lastMessageTime

      FROM chats c
      JOIN chat_members cm ON c.id = cm.chat_id
      WHERE cm.user_id = ?
      ORDER BY lastMessageTime DESC
    `,
      [userId],
    );

    res.json(chats);
  } catch (err) {
    console.error("Get chats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET MESSAGES (WITH PAGINATION) ================= */

exports.getMessages = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  try {
    // 🔒 ACCESS CHECK
    const [access] = await db.query(
      "SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?",
      [chatId, userId],
    );

    if (!access.length) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [messages] = await db.query(
      `
      SELECT m.*, u.name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = ?
      AND (m.deleted_for_everyone IS NULL OR m.deleted_for_everyone = 0)
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [chatId, limit, offset],
    );

    res.json(messages.reverse()); // keep UI ASC
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= SEND MESSAGE ================= */

exports.sendMessage = async (req, res) => {
  const { chatId, message } = req.body;
  const senderId = req.user.id;

  const cleanMessage = message?.trim();

  if (!chatId || !cleanMessage) {
    return res.status(400).json({ message: "Invalid message" });
  }

  try {
    // 🔒 ACCESS CHECK (CRITICAL FIX)
    const [access] = await db.query(
      "SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?",
      [chatId, senderId],
    );

    if (!access.length) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [result] = await db.query(
      "INSERT INTO messages (chat_id, sender_id, message) VALUES (?, ?, ?)",
      [chatId, senderId, cleanMessage],
    );

    res.json({
      success: true,
      message: "Message sent",
      messageId: result.insertId,
      delivered: 1,
      seen: 0,
    });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= EDIT MESSAGE ================= */

exports.editMessage = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const userId = req.user.id;

  const cleanMessage = message?.trim();

  if (!cleanMessage) {
    return res.status(400).json({ message: "Message cannot be empty" });
  }

  try {
    const [existing] = await db.query(
      "SELECT 1 FROM messages WHERE id = ? AND sender_id = ?",
      [id, userId],
    );

    if (!existing.length) {
      return res.status(403).json({
        message: "Not allowed to edit this message",
      });
    }

    await db.query("UPDATE messages SET message = ?, edited = 1 WHERE id = ?", [
      cleanMessage,
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
    const [existing] = await db.query(
      "SELECT 1 FROM messages WHERE id = ? AND sender_id = ?",
      [id, userId],
    );

    if (!existing.length) {
      return res.status(403).json({
        message: "Not allowed to delete this message",
      });
    }

    await db.query(
      "UPDATE messages SET deleted_for_everyone = 1 WHERE id = ?",
      [id],
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ message: "Delete failed" });
  }
};
