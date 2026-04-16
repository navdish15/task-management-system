const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken"); // ✅ ADDED

require("dotenv").config();
require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const taskRoutes = require("./routes/taskRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const chatRoutes = require("./routes/chatRoutes");
const projectRoutes = require("./routes/projectRoutes");

const chatSocket = require("./socket/chatSocket");

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= ROUTES ================= */

app.use("/api", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/projects", projectRoutes);

/* ================= SOCKET.IO SETUP ================= */

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

/* ================= 🔐 SOCKET AUTH (NEW) ================= */

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    console.log("❌ Socket blocked (no token)");
    return next(new Error("Unauthorized"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

    socket.user = decoded; // ✅ attach user
    next();
  } catch (err) {
    console.log("❌ Invalid token");
    return next(new Error("Unauthorized"));
  }
});

/* ================= ONLINE USERS ================= */

const onlineUsers = new Set();

/* ================= CONNECTION ================= */

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.user.username);

  /* ===== JOIN ROOM ===== */
  socket.on("joinRoom", () => {
    const username = socket.user.username;

    socket.join(username);
    onlineUsers.add(username);

    io.emit("updateOnlineUsers", Array.from(onlineUsers));
  });

  /* ===== CHAT SOCKET LOGIC ===== */
  chatSocket(io, socket);

  /* ===== DISCONNECT ===== */
  socket.on("disconnect", () => {
    const username = socket.user?.username;

    if (username) {
      onlineUsers.delete(username);
      io.emit("updateOnlineUsers", Array.from(onlineUsers));
    }

    console.log("❌ User disconnected:", username);
  });
});

/* ================= START SERVER ================= */

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
