const { pool: db } = require("../config/db");

/**
 * Create notification in DB
 * @param {number} userId
 * @param {string} message
 */
const createNotification = async (userId, message) => {
  try {
    await db.query(
      "INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, 0)",
      [userId, message],
    );
  } catch (err) {
    console.error("Notification error:", err);
  }
};

module.exports = {
  createNotification,
};
