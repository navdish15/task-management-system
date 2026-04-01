const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();
require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const taskRoutes = require("./routes/taskRoutes");
const employeeRoutes = require("./routes/employeeRoutes"); // ✅ ADDED
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
app.use("/api/employee", employeeRoutes); // ✅ ADDED (VERY IMPORTANT)
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

// Track online users
const onlineUsers = new Set();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  /* ===== ONLINE USERS ===== */
  socket.on("joinRoom", (username) => {
    socket.username = username;
    socket.join(username);

    onlineUsers.add(username);
    io.emit("updateOnlineUsers", Array.from(onlineUsers));
  });

  /* ===== CHAT SOCKET LOGIC ===== */
  chatSocket(io, socket);

  socket.on("disconnect", () => {
    if (socket.username) {
      onlineUsers.delete(socket.username);
      io.emit("updateOnlineUsers", Array.from(onlineUsers));
    }
    console.log("User disconnected:", socket.id);
  });
});

/* ================= START SERVER ================= */

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
