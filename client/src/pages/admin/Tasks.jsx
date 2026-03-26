import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import AdminLayout from "../../components/AdminLayout";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const [editingTask, setEditingTask] = useState(null); // ✅ ADDED

  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;

  const [formData, setFormData] = useState({
    employee_username: "",
    task_name: "",
    description: "",
    deadline: "",
    priority: "Low",
  });

  /* ================= FETCH EMPLOYEES ================= */

  useEffect(() => {
    if (!token) return;

    axios
      .get("http://localhost:5000/api/admin/employees", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setEmployees(res.data))
      .catch((err) => console.error(err));
  }, [token]);

  /* ================= FETCH TASKS ================= */

  const fetchTasks = useCallback(() => {
    if (!token) return;

    axios
      .get("http://localhost:5000/api/tasks/admin/all-normal-tasks", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));
  }, [token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /* ================= ASSIGN TASK ================= */

  const assignTask = async () => {
    if (
      !formData.employee_username ||
      !formData.task_name ||
      !formData.deadline
    ) {
      alert("Please fill all required fields");
      return;
    }

    const data = new FormData();
    data.append("employee_username", formData.employee_username);
    data.append("task_name", formData.task_name);
    data.append("description", formData.description);
    data.append("deadline", formData.deadline);
    data.append("priority", formData.priority);

    if (selectedFile) {
      data.append("file", selectedFile);
    }

    try {
      await axios.post("http://localhost:5000/api/tasks", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setFormData({
        employee_username: "",
        task_name: "",
        description: "",
        deadline: "",
        priority: "Low",
      });

      setSelectedFile(null);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= DELETE ================= */

  const deleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= APPROVE / REJECT ================= */

  const approveTask = async (id) => {
    await axios.put(
      `http://localhost:5000/api/tasks/admin/approve/${id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    fetchTasks();
  };

  const rejectTask = async (id) => {
    await axios.put(
      `http://localhost:5000/api/tasks/reject/${id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    fetchTasks();
  };

  /* ================= UPDATE TASK ================= */

  const updateTask = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/tasks/${editingTask.id}`,
        editingTask,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout>
      <div className="task-container">
        {/* ================= ASSIGN CARD ================= */}
        <div className="task-card">
          <h2>Assign Task</h2>

          <div className="task-grid">
            <div className="form-group">
              <label>Employee</label>
              <select
                value={formData.employee_username}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    employee_username: e.target.value,
                  })
                }
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.username} value={emp.username}>
                    {emp.username}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Task Name</label>
              <input
                type="text"
                value={formData.task_name}
                onChange={(e) =>
                  setFormData({ ...formData, task_name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Deadline</label>
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Description</label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="form-group full-width">
            <label>Attach File (Optional)</label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
          </div>

          <div className="btn-center">
            <button className="btn-assign" onClick={assignTask}>
              Assign Task
            </button>
          </div>
        </div>

        {/* ================= TASK TABLE ================= */}

        <h2 style={{ marginTop: "40px" }}>Assigned Tasks</h2>

        <div className="table-wrapper">
          <table className="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Employee</th>
                <th>Deadline</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Admin File</th>
                <th>Submitted File</th>
                <th>Submission Text</th>
                <th>Actions</th>
                <th>Approval</th>
              </tr>
            </thead>

            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="10">No tasks assigned</td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.task_name}</td>
                    <td>{task.employee_username}</td>
                    <td>{new Date(task.deadline).toLocaleString()}</td>
                    <td>{task.priority}</td>

                    <td>
                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: "20px",
                          color: "white",
                          background:
                            task.status === "Pending"
                              ? "orange"
                              : task.status === "In Progress"
                                ? "blue"
                                : task.status === "Submitted"
                                  ? "purple"
                                  : "green",
                        }}
                      >
                        {task.status}
                      </span>
                    </td>

                    <td>
                      {task.uploaded_file ? (
                        <a
                          href={`http://localhost:5000/uploads/${task.uploaded_file}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        "No File"
                      )}
                    </td>

                    <td>
                      {task.submitted_file ? (
                        <a
                          href={`http://localhost:5000/uploads/${task.submitted_file}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        "No Submission"
                      )}
                    </td>

                    <td>{task.submission_text || "—"}</td>

                    {/* ✅ UPDATED ACTIONS */}
                    <td>
                      <button
                        style={{
                          marginRight: "10px",
                          background: "#4e73df",
                          color: "white",
                          padding: "5px 10px",
                          border: "none",
                          borderRadius: "5px",
                        }}
                        onClick={() => setEditingTask(task)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn-delete"
                        onClick={() => deleteTask(task.id)}
                      >
                        Delete
                      </button>
                    </td>

                    <td>
                      {task.status === "Submitted" ? (
                        <>
                          <button
                            style={{
                              marginRight: "10px",
                              background: "green",
                              color: "white",
                              padding: "5px 10px",
                              border: "none",
                              borderRadius: "5px",
                            }}
                            onClick={() => approveTask(task.id)}
                          >
                            Approve
                          </button>

                          <button
                            style={{
                              background: "red",
                              color: "white",
                              padding: "5px 10px",
                              border: "none",
                              borderRadius: "5px",
                            }}
                            onClick={() => rejectTask(task.id)}
                          >
                            Reject
                          </button>
                        </>
                      ) : task.status === "Completed" ? (
                        <span style={{ color: "green", fontWeight: "bold" }}>
                          Approved ✅
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ EDIT MODAL */}
        {editingTask && (
          <div className="modal">
            <div className="modal-content">
              <h3>Edit Task</h3>

              <input
                type="text"
                value={editingTask.task_name}
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    task_name: e.target.value,
                  })
                }
              />

              <input
                type="datetime-local"
                value={editingTask.deadline}
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    deadline: e.target.value,
                  })
                }
              />

              <select
                value={editingTask.priority}
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    priority: e.target.value,
                  })
                }
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>

              <div className="modal-actions">
                <button className="btn-save" onClick={updateTask}>
                  Save
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default Tasks;
