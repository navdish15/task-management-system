import { NavLink } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import socket from "../services/socket";
import logout from "../utils/logout";
import FloatingChat from "../components/chat/FloatingChat";
import "../assets/employee.css";

function EmployeeLayout({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef();

  const user = JSON.parse(localStorage.getItem("user"));

  /* ================= FETCH + SOCKET ================= */

  useEffect(() => {
    if (!user?.username) return;

    socket.emit("joinRoom", user.username);

    const loadNotifications = async () => {
      try {
        const res = await api.get("/notifications");
        setNotifications(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    loadNotifications();

    socket.on("newNotification", (data) => {
      setNotifications((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`, // ✅ safer ID
          message: data.message,
          is_read: false,
        },
        ...prev,
      ]);
    });

    return () => {
      socket.off("newNotification");
      socket.emit("leaveRoom", user.username); // ✅ cleanup
    };
  }, [user?.username]);

  /* ================= OUTSIDE CLICK ================= */

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showDropdown]);

  /* ================= HELPERS ================= */

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

  /* ================= RENDER ================= */

  return (
    <div>
      {/* ================= HEADER ================= */}

      <header className="employee-header">
        <h1>Employee Panel</h1>

        <div className="header-actions">
          {/* 🔔 Notification */}
          <div className="notification-wrapper" ref={dropdownRef}>
            <span
              className="bell-icon"
              onClick={(e) => {
                e.stopPropagation(); // ✅ prevent instant close
                setShowDropdown(!showDropdown);
              }}
            >
              🔔
            </span>

            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
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

          {/* LOGOUT */}
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

      {/* ================= MAIN ================= */}

      <main className="employee-main">{children}</main>

      {/* ================= FOOTER ================= */}

      <footer className="employee-footer">
        © {new Date().getFullYear()} TaskManager. All rights reserved.
      </footer>

      {/* ================= CHAT ================= */}

      {user && <FloatingChat currentUser={user} />}
    </div>
  );
}

export default EmployeeLayout;
