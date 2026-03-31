import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "../../services/api";
import socket from "../../services/socket";
import AdminLayout from "../../components/AdminLayout";
import "../../assets/adminusers.css";

const DEPARTMENTS = ["HR", "Software", "Marketing", "Sales"];

function Users() {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editUserId, setEditUserId] = useState(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "employee",
    department: "",
    status: "active",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;

  const debounceRef = useRef(null);

  /* ================= FETCH USERS ================= */

  const fetchUsers = useCallback(() => {
    setLoading(true);

    api
      .get(`/admin/users?search=${search}`)
      .then((res) => setUsers(res.data))
      .catch((err) => {
        console.error(err);
        alert("Failed to load users");
      })
      .finally(() => setLoading(false));
  }, [search]);

  /* ================= DEBOUNCE ================= */

  useEffect(() => {
    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchUsers();
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [search, fetchUsers]);

  /* ================= SOCKET ================= */

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) {
      socket.emit("joinRoom", username);
    }

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    socket.off("updateOnlineUsers", handleOnlineUsers);
    socket.on("updateOnlineUsers", handleOnlineUsers);

    return () => socket.off("updateOnlineUsers", handleOnlineUsers);
  }, []);

  /* ================= OPTIMIZED SET ================= */

  const onlineSet = useMemo(() => new Set(onlineUsers), [onlineUsers]);

  /* ================= DELETE ================= */

  const deleteUser = (id) => {
    if (window.confirm("Delete this user?")) {
      api
        .delete(`/admin/users/${id}`)
        .then(fetchUsers)
        .catch(() => alert("Delete failed"));
    }
  };

  /* ================= STATUS ================= */

  const toggleStatus = (id) => {
    api
      .put(`/admin/users/toggle/${id}`)
      .then(fetchUsers)
      .catch(() => alert("Update failed"));
  };

  /* ================= EDIT ================= */

  const handleEdit = (user) => {
    setIsEditMode(true);
    setEditUserId(user.id);
    setShowModal(true);

    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      department: user.department || "",
      status: user.status,
    });
  };

  /* ================= SAVE ================= */

  const saveUser = () => {
    if (!formData.username) return alert("Username required");
    if (!formData.email.includes("@")) return alert("Invalid email");

    if (!isEditMode && !formData.password) {
      return alert("Password required");
    }

    const request = isEditMode
      ? api.put(`/admin/users/${editUserId}`, formData)
      : api.post("/admin/users", formData);

    request
      .then(() => {
        resetForm();
        fetchUsers();
      })
      .catch(() => alert("Save failed"));
  };

  /* ================= RESET ================= */

  const resetForm = () => {
    setShowModal(false);
    setIsEditMode(false);
    setEditUserId(null);

    setFormData({
      username: "",
      email: "",
      password: "",
      role: "employee",
      department: "",
      status: "active",
    });
  };

  /* ================= PAGINATION ================= */

  const totalPages = Math.max(1, Math.ceil(users.length / usersPerPage));

  const currentUsers = useMemo(() => {
    const last = currentPage * usersPerPage;
    return users.slice(last - usersPerPage, last);
  }, [users, currentPage]);

  return (
    <AdminLayout>
      <div className="users-container">
        {/* HEADER */}
        <div className="users-header">
          <div>
            <h2>Manage Users</h2>
            <p>Manage all system users</p>
          </div>

          <div className="header-actions">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />

            <button className="btn-create" onClick={() => setShowModal(true)}>
              + Create User
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Loading users...</td>
                </tr>
              ) : currentUsers.length === 0 ? (
                <tr>
                  <td colSpan="7">No users found</td>
                </tr>
              ) : (
                currentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>

                    <td>
                      {user.username}
                      {onlineSet.has(user.username) && (
                        <span className="online-dot"></span>
                      )}
                    </td>

                    <td>{user.email}</td>

                    <td>
                      <span className={`role-badge ${user.role || ""}`}>
                        {user.role}
                      </span>
                    </td>

                    <td>
                      {user.department ? (
                        <span className="dept-badge">{user.department}</span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      <span className={`status-badge ${user.status}`}>
                        {user.status}
                      </span>
                    </td>

                    <td className="action-buttons">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn-delete"
                        onClick={() => deleteUser(user.id)}
                      >
                        Delete
                      </button>

                      <button
                        className="btn-toggle"
                        onClick={() => toggleStatus(user.id)}
                      >
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="pagination">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              className={
                currentPage === i + 1 ? "page-btn active-page" : "page-btn"
              }
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{isEditMode ? "Edit User" : "Create User"}</h3>

            <input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />

            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />

            {!isEditMode && (
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            )}

            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>

            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <div className="modal-buttons">
              <button className="btn-cancel" onClick={resetForm}>
                Cancel
              </button>
              <button className="btn-save" onClick={saveUser}>
                {isEditMode ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default Users;
