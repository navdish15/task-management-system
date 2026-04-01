const { promisePool: db } = require("../config/db");

module.exports = (io, socket) => {
  /* ================= JOIN CHAT ================= */
  socket.on("join_chat", (chatId) => {
    if (!chatId) return;
    socket.join(`chat_${chatId}`);
  });

  /* ================= LEAVE CHAT ================= */
  socket.on("leave_chat", (chatId) => {
    if (!chatId) return;
    socket.leave(`chat_${chatId}`);
  });

  /* ================= HELPER: CHECK MEMBERSHIP ================= */
  const isUserInChat = async (chatId, userId) => {
    const [rows] = await db.query(
      "SELECT 1 FROM chat_members WHERE chat_id=? AND user_id=?",
      [chatId, userId],
    );
    return rows.length > 0;
  };

  /* ================= SEND MESSAGE ================= */
  socket.on("send_message", async (data) => {
    const { chatId, senderId, message, file_url, file_name } = data;

    const cleanMessage = message?.trim();

    if (!chatId || !senderId) return;
    if (!cleanMessage && !file_url) return;

    try {
      // 🔒 membership check
      if (!(await isUserInChat(chatId, senderId))) return;

      const [result] = await db.query(
        `INSERT INTO messages 
        (chat_id, sender_id, message, file_url, file_name, is_read) 
        VALUES (?, ?, ?, ?, ?, 0)`,
        [
          chatId,
          senderId,
          cleanMessage || null,
          file_url || null,
          file_name || null,
        ],
      );

      const [rows] = await db.query(`SELECT * FROM messages WHERE id = ?`, [
        result.insertId,
      ]);

      if (!rows.length) return;

      const msg = rows[0];

      const newMessage = {
        ...msg,
        chatId: msg.chat_id,
        delivered: 1,
        seen: 0,
      };

      io.to(`chat_${chatId}`).emit("receive_message", newMessage);
    } catch (err) {
      console.error("Send message error:", err);
    }
  });

  /* ================= EDIT MESSAGE ================= */
  socket.on("edit_message", async (data) => {
    const { id, message, chatId, requesterId } = data;

    const cleanMessage = message?.trim();
    if (!id || !cleanMessage || !requesterId) return;

    try {
      const [msgRows] = await db.query(
        "SELECT sender_id FROM messages WHERE id = ?",
        [id],
      );
      if (!msgRows.length) return;

      const senderId = msgRows[0].sender_id;

      const [userRows] = await db.query("SELECT role FROM users WHERE id = ?", [
        requesterId,
      ]);
      if (!userRows.length) return;

      const role = userRows[0].role;

      // 🔒 permission check
      if (requesterId !== senderId && role !== "admin") return;

      await db.query(
        `UPDATE messages SET message = ?, edited = 1 WHERE id = ?`,
        [cleanMessage, id],
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

    if (!id || !chatId || !requesterId) return;

    try {
      const [rows] = await db.query(
        `SELECT sender_id FROM messages WHERE id = ?`,
        [id],
      );
      if (!rows.length) return;

      const senderId = rows[0].sender_id;

      const [users] = await db.query(`SELECT role FROM users WHERE id = ?`, [
        requesterId,
      ]);
      if (!users.length) return;

      const role = users[0].role;

      if (requesterId !== senderId && role !== "admin") return;

      await db.query(
        `UPDATE messages SET deleted_for_everyone = 1 WHERE id = ?`,
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

    if (!id || !userId) return;

    try {
      const [rows] = await db.query(
        `SELECT deleted_by FROM messages WHERE id = ?`,
        [id],
      );
      if (!rows.length) return;

      let deletedBy = rows[0].deleted_by || "";
      const arr = deletedBy ? deletedBy.split(",") : [];

      if (!arr.includes(String(userId))) {
        arr.push(String(userId));
      }

      await db.query(`UPDATE messages SET deleted_by = ? WHERE id = ?`, [
        arr.join(","),
        id,
      ]);

      socket.emit("message_deleted_for_me", id);
    } catch (err) {
      console.error("Delete for me error:", err);
    }
  });

  /* ================= MARK AS READ ================= */
  socket.on("mark_read", async (data) => {
    const { chatId, readerId } = data;

    if (!chatId || !readerId) return;

    try {
      if (!(await isUserInChat(chatId, readerId))) return;

      await db.query(
        `UPDATE messages 
         SET is_read = 1 
         WHERE chat_id = ? AND sender_id != ?`,
        [chatId, readerId],
      );

      io.to(`chat_${chatId}`).emit("messages_read", {
        chatId,
        readerId,
      });
    } catch (err) {
      console.error("Mark read error:", err);
    }
  });

  /* ================= TYPING ================= */
  socket.on("typing", async (data) => {
    const { chatId, senderId } = data;

    if (!chatId || !senderId) return;

    if (!(await isUserInChat(chatId, senderId))) return;

    socket.to(`chat_${chatId}`).emit("user_typing", {
      chatId,
      senderId,
    });
  });
};
