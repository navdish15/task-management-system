const express = require("express");
const router = express.Router();
const { pool: db } = require("../config/db");
const jwt = require("jsonwebtoken");

/* ================= LOGIN ================= */

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const query = "SELECT * FROM users WHERE username = ?";

  db.query(query, [username], (err, results) => {
    if (err) return res.status(500).json({ message: "DB Error" });

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = results[0];

    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status === "inactive") {
      return res.status(403).json({
        message:
          "Your account is deactivated. Please contact the administrator.",
      });
    }

    /* ================= GENERATE JWT ================= */

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username, // 👈 IMPORTANT FIX
        role: user.role,
      },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" },
    );

    /* ================= SEND RESPONSE ================= */

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
