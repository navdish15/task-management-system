const express = require("express");
const router = express.Router();
const { pool: db } = require("../config/db");
const jwt = require("jsonwebtoken");

/* ================= LOGIN ================= */

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // 🔥 Input Validation
  if (!username || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  const sql = "SELECT * FROM users WHERE username = ?";

  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("Login DB Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    // 🔥 User not found
    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = results[0];

    // 🔥 Password check (bcrypt skipped intentionally)
    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🔥 Account status check
    if (user.status === "inactive") {
      return res.status(403).json({
        message:
          "Your account is deactivated. Please contact the administrator.",
      });
    }

    // 🔥 JWT Secret Safety Check
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in environment variables");
      return res.status(500).json({ message: "Server configuration error" });
    }

    // 🔥 Generate Token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    // 🔥 Response
    res.json({
      message: "success",
      id: user.id,
      username: user.username,
      role: user.role,
      token,
    });
  });
});

module.exports = router;
