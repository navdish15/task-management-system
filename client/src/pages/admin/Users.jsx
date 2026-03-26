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

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "employee",
    status: "active",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;

  /* ================= FETCH USERS ================= */

  const fetchUsers = useCallback(() => {
    api
      .get(`/admin/users?search=${search}`)
      .then((res) => setUsers(res.data))
      .catch((err) => console.error(err));
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ================= SOCKET ONLINE LISTENER ================= */

  useEffect(() => {
    socket.on("updateOnlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("updateOnlineUsers");
    };
  }, []);

  /* ================= DELETE USER ================= */

  const deleteUser = (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      api
        .delete(`/admin/users/${id}`)
        .then(() => fetchUsers())
        .catch((err) => console.error(err));
    }
  };

  /* ================= TOGGLE STATUS ================= */

  const toggleStatus = (id) => {
    api
      .put(`/admin/users/toggle/${id}`)
      .then(() => fetchUsers())
      .catch((err) => console.error(err));
  };

  /* ================= CREATE USER ================= */

  const createUser = () => {
    if (!formData.username || !formData.password) {
      alert("Username and Password are required!");
      return;
    }

    api
      .post("/admin/users", formData)
      .then(() => {
        setShowModal(false);
        setFormData({
          username: "",
          email: "",
          password: "",
          role: "employee",
          status: "active",
        });
        fetchUsers();
      })
      .catch((err) => console.error(err));
  };

  /* ================= PAGINATION ================= */

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
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
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>

                  <td>
                    {user.username}
                    {onlineUsers.includes(user.username) && (
                      <span
                        style={{
                          color: "green",
                          marginLeft: "8px",
                          fontSize: "14px",
                        }}
                      >
                        ●
                      </span>
                    )}
                  </td>

                  <td>{user.email}</td>
                  <td>{user.role}</td>

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
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              className={
                currentPage === index + 1 ? "page-btn active-page" : "page-btn"
              }
              onClick={() => setCurrentPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Create New User</h3>

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

            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />

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
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button className="btn-save" onClick={createUser}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default Users;
