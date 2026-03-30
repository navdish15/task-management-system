import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";
import logout from "../utils/logout";
import FloatingChat from "../components/chat/FloatingChat";
import "../assets/admin.css";

function AdminLayout({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // 🔐 Safe localStorage parse
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  useEffect(() => {
    if (!user?.username) return;

    // Join room
    socket.emit("joinRoom", user.username);

    const loadNotifications = async () => {
      try {
        const res = await api.get("/notifications");
        setNotifications(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    loadNotifications();

    socket.on("newNotification", (data) => {
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(), // 🔥 safer ID
          message: data.message,
          is_read: false,
        },
        ...prev,
      ]);
    });

    return () => {
      socket.off("newNotification");
      socket.emit("leaveRoom", user.username); // 🔥 cleanup
    };
  }, [user?.username]);

  // 🔥 Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (
        !e.target.closest(".notification-dropdown") &&
        !e.target.closest(".notification-icon")
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/read/${id}`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* ================= HEADER ================= */}
      <header className="admin-header">
        <h1>Admin Dashboard</h1>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* 🔔 Notification Bell */}
          <div style={{ position: "relative", cursor: "pointer" }}>
            <span
              className="notification-icon"
              style={{ fontSize: "22px" }}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              🔔
            </span>

            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-8px",
                  right: "-8px",
                  background: "red",
                  color: "white",
                  borderRadius: "50%",
                  padding: "2px 6px",
                  fontSize: "12px",
                }}
              >
                {unreadCount}
              </span>
            )}

            {/* Dropdown */}
            {showDropdown && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h4>Notifications</h4>
                  {notifications.length > 0 && (
                    <button onClick={markAllAsRead}>Mark All</button>
                  )}
                </div>

                <div className="notification-list">
                  {notifications.length === 0 && (
                    <p className="no-notifications">No notifications</p>
                  )}

                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notification-item ${
                        !n.is_read ? "unread" : ""
                      }`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="notification-icon">
                        {n.message.includes("assigned") && "📌"}
                        {n.message.includes("submitted") && "📤"}
                        {n.message.includes("approved") && "✅"}
                        {n.message.includes("rejected") && "❌"}
                      </div>

                      <div className="notification-content">
                        <p>{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">
        <NavLink to="/admin-dashboard" end>
          Dashboard
        </NavLink>

        <NavLink to="/admin/projects">Projects</NavLink>

        <NavLink to="/admin/users">User Management</NavLink>

        <NavLink to="/admin/tasks">Assign Task</NavLink>

        <NavLink to="/admin/audit">Audit Logs</NavLink>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="main-content">{children}</main>

      {/* ================= FOOTER ================= */}
      <footer className="admin-footer">
        © {new Date().getFullYear()} TaskManager. All rights reserved.
      </footer>

      {/* ================= FLOATING CHAT ================= */}
      {user && <FloatingChat currentUser={user} />}
    </div>
  );
}

export default AdminLayout;
