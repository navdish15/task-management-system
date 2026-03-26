const { promisePool: db } = require("../config/db");

module.exports = (io, socket) => {
  /* ================= JOIN CHAT ================= */
  socket.on("join_chat", (chatId) => {
    if (!chatId) return;
    socket.join(`chat_${chatId}`);
  });

  /* ================= SEND MESSAGE ================= */
  socket.on("send_message", async (data) => {
    const { chatId, senderId, message, file_url, file_name } = data;

    if (!chatId || !senderId) return;

    try {
      const [result] = await db.query(
        `INSERT INTO messages 
        (chat_id, sender_id, message, file_url, file_name, is_read) 
        VALUES (?, ?, ?, ?, ?, 0)`,
        [
          chatId,
          senderId,
          message || null,
          file_url || null,
          file_name || null,
        ],
      );

      const newMessage = {
        id: result.insertId,
        chatId,
        sender_id: senderId,
        message,
        file_url,
        file_name,
        is_read: 0,
        edited: 0,
        deleted_for_everyone: 0,
        created_at: new Date(),
      };

      io.to(`chat_${chatId}`).emit("receive_message", newMessage);
    } catch (err) {
      console.error("Send message error:", err);
    }
  });

  /* ================= EDIT MESSAGE ================= */
  socket.on("edit_message", async (data) => {
    const { id, message, chatId } = data;

    if (!id || !message) return;

    try {
      await db.query(
        `UPDATE messages 
         SET message = ?, edited = 1 
         WHERE id = ?`,
        [message, id],
      );

      const [rows] = await db.query(`SELECT * FROM messages WHERE id = ?`, [
        id,
      ]);

      if (rows.length > 0) {
        io.to(`chat_${chatId}`).emit("message_updated", rows[0]);
      }
    } catch (err) {
      console.error("Edit message error:", err);
    }
  });

  /* ================= DELETE FOR EVERYONE ================= */
  socket.on("delete_for_everyone", async (data) => {
    const { id, chatId, requesterId } = data;

    try {
      const [rows] = await db.query(
        `SELECT sender_id FROM messages WHERE id = ?`,
        [id],
      );

      if (rows.length === 0) return;

      const senderId = rows[0].sender_id;

      // get requester role
      const [users] = await db.query(`SELECT role FROM users WHERE id = ?`, [
        requesterId,
      ]);

      if (users.length === 0) return;

      const role = users[0].role;

      // Rule 2 logic
      if (requesterId !== senderId && role !== "admin") {
        return;
      }

      await db.query(
        `UPDATE messages 
         SET deleted_for_everyone = 1 
         WHERE id = ?`,
        [id],
      );

      io.to(`chat_${chatId}`).emit("message_deleted_for_everyone", id);
    } catch (err) {
      console.error("Delete for everyone error:", err);
    }
  });

  /* ================= DELETE FOR ME ================= */
  socket.on("delete_for_me", async (data) => {
    const { id, userId } = data;

    try {
      const [rows] = await db.query(
        `SELECT deleted_by FROM messages WHERE id = ?`,
        [id],
      );

      if (rows.length === 0) return;

      let deletedBy = rows[0].deleted_by || "";

      const arr = deletedBy ? deletedBy.split(",") : [];

      if (!arr.includes(String(userId))) {
        arr.push(String(userId));
      }

      await db.query(
        `UPDATE messages 
         SET deleted_by = ? 
         WHERE id = ?`,
        [arr.join(","), id],
      );

      socket.emit("message_deleted_for_me", id);
    } catch (err) {
      console.error("Delete for me error:", err);
    }
  });

  /* ================= MARK AS READ ================= */
  socket.on("mark_read", async (data) => {
    const { chatId, readerId } = data;

    try {
      await db.query(
        `UPDATE messages 
         SET is_read = 1 
         WHERE chat_id = ? AND sender_id != ?`,
        [chatId, readerId],
      );

      io.to(`chat_${chatId}`).emit("messages_read", { chatId });
    } catch (err) {
      console.error("Mark read error:", err);
    }
  });

  /* ================= TYPING ================= */
  socket.on("typing", (data) => {
    const { chatId, senderId } = data;

    socket.to(`chat_${chatId}`).emit("user_typing", {
      chatId,
      senderId,
    });
  });
};
