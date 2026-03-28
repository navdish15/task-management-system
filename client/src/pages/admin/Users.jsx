import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import socket from "../../services/socket";
import AdminLayout from "../../components/AdminLayout";
import "../../assets/adminUsers.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

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

  /* ================= FETCH USERS ================= */

  const fetchUsers = useCallback(() => {
    api
      .get(`/admin/users?search=${search}`)
      .then((res) => setUsers(res.data))
      .catch(console.error);
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ================= SOCKET ================= */

  useEffect(() => {
    socket.on("updateOnlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => socket.off("updateOnlineUsers");
  }, []);

  /* ================= DELETE ================= */

  const deleteUser = (id) => {
    if (window.confirm("Delete this user?")) {
      api.delete(`/admin/users/${id}`).then(fetchUsers).catch(console.error);
    }
  };

  /* ================= STATUS ================= */

  const toggleStatus = (id) => {
    api.put(`/admin/users/toggle/${id}`).then(fetchUsers).catch(console.error);
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
    if (!formData.username) {
      alert("Username is required!");
      return;
    }

    if (isEditMode) {
      api
        .put(`/admin/users/${editUserId}`, formData)
        .then(() => {
          resetForm();
          fetchUsers();
        })
        .catch(console.error);
    } else {
      if (!formData.password) {
        alert("Password is required!");
        return;
      }

      api
        .post("/admin/users", formData)
        .then(() => {
          resetForm();
          fetchUsers();
        })
        .catch(console.error);
    }
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

  const indexOfLastUser = currentPage * usersPerPage;
  const currentUsers = users.slice(
    indexOfLastUser - usersPerPage,
    indexOfLastUser,
  );
  const totalPages = Math.ceil(users.length / usersPerPage);

  return (
    <AdminLayout>
      <div className="users-container">
        {/* HEADER */}
        <div className="users-header">
          <div>
            <h2>Manage Users</h2>
            <p>Here you can manage users.</p>
          </div>

          <div className="header-actions">
            {/* ✅ FIXED SEARCH UI */}
            <div className="search-inline">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <button
                onClick={() => {
                  setCurrentPage(1);
                  fetchUsers();
                }}
              >
                Search
              </button>
            </div>

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
              {currentUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>

                  <td>
                    {user.username}
                    {onlineUsers.includes(user.username) && <span> ●</span>}
                  </td>

                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.department || "-"}</td>

                  <td>
                    <span
                      className={
                        user.status === "active"
                          ? "status-active"
                          : "status-inactive"
                      }
                    >
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
              ))}
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
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>{isEditMode ? "Edit User" : "Create New User"}</h3>

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
              <option value="HR">HR</option>
              <option value="Software">Software</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
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
