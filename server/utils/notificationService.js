const { pool: db } = require("../config/db");

/**
 * Create notification in DB
 * @param {number} userId
 * @param {string} message
 */
const createNotification = async (userId, message) => {
  try {
    if (!userId || !message) {
      console.warn("⚠ Invalid notification data");
      return null;
    }

    const cleanMessage = message.trim();

    const [result] = await db.query(
      "INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, 0)",
      [userId, cleanMessage],
    );

    return result.insertId;
  } catch (err) {
    console.error("Notification error:", err);
    return null;
  }
};

module.exports = {
  createNotification,
};
