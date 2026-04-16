import socket from "../services/socket";

const logout = () => {
  try {
    // ✅ Disconnect socket first
    socket.disconnect();

    // ✅ Clear user data
    localStorage.removeItem("user");

    // ✅ Redirect to login page
    window.location.href = "/";
  } catch (error) {
    console.error("Logout error:", error);
  }
};

export default logout;
