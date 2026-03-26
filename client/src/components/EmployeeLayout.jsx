import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import socket from "../services/socket";
import logout from "../utils/logout";
import FloatingChat from "../components/chat/FloatingChat";
import "../assets/employee.css";

function EmployeeLayout({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user?.username) return;

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
          id: Date.now(),
          message: data.message,
          is_read: false,
        },
        ...prev,
      ]);
    });

    return () => {
      socket.off("newNotification");
    };
  }, [user?.username]);

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

      <header className="employee-header">
        <h1>Employee Panel</h1>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ position: "relative", cursor: "pointer" }}>
            <span
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
                      className={`notification-item ${!n.is_read ? "unread" : ""}`}
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

          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {/* ================= SIDEBAR ================= */}

      <aside className="employee-sidebar">
        <NavLink to="/employee-dashboard">Dashboard</NavLink>
        <NavLink to="/employee/tasks">My Tasks</NavLink>
        <NavLink to="/employee/projects">My Projects</NavLink>
      </aside>

      {/* ================= MAIN CONTENT ================= */}

      <main className="employee-main">{children}</main>

      {/* ================= FOOTER ================= */}

      <footer className="employee-footer">
        © {new Date().getFullYear()} TaskManager. All rights reserved.
      </footer>

      {/* ================= FLOATING CHAT ================= */}

      {user && <FloatingChat currentUser={user} />}
    </div>
  );
}

export default EmployeeLayout;
