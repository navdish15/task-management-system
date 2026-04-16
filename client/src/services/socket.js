import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  autoConnect: false, // ✅ important
  transports: ["websocket"],
  withCredentials: true,

  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

// ===== EVENTS =====
socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected");
});

socket.on("connect_error", (err) => {
  console.error("Error:", err.message);
});

export const sendTestLog = () => {
  socket.emit("test_log", { message: "Hello" });
};

export default socket;
