import { io } from "socket.io-client";

// 🔥 Create single socket instance
const socket = io("http://localhost:5000", {
  autoConnect: true,
  transports: ["websocket"], // faster & avoids polling issues
  withCredentials: true,

  // 🔁 Reconnection settings
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

// ================= CONNECTION EVENTS =================

// ✅ Connected
socket.on("connect", () => {
  console.log("✅ Connected to socket:", socket.id);
});

// ❌ Disconnected
socket.on("disconnect", () => {
  console.log("❌ Disconnected from socket");
});

// ⚠️ Connection error
socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err.message);
});

// 🔁 Reconnecting
socket.on("reconnect_attempt", (attempt) => {
  console.log("🔄 Reconnecting attempt:", attempt);
});

// 🔁 Reconnected
socket.on("reconnect", () => {
  console.log("🔁 Reconnected successfully");
});

// ❌ Reconnect failed
socket.on("reconnect_failed", () => {
  console.error("❌ Reconnection failed");
});

// ================= OPTIONAL HELPERS =================

// 🔥 Test emit (for debugging backend)
export const sendTestLog = () => {
  socket.emit("test_log", { message: "Hello from frontend" });
};

// ================= EXPORT =================
export default socket;
