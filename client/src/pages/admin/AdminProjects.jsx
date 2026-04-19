import React, { useEffect, useState, useMemo } from "react";
import Select from "react-select";
import api from "../../services/api";
import AdminLayout from "../../components/AdminLayout";
import "../../assets/adminProjects.css";

const AdminProjects = () => {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const [viewMode, setViewMode] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedRole, setSelectedRole] = useState("All");
  const [editingTask, setEditingTask] = useState(null);

  // ✅ NEW SEARCH + FILTER STATE
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // ✅ LOADING STATE
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    project_name: "",
    description: "",
    start_date: "",
    due_date: "",
    members: [],
  });

  const [taskForm, setTaskForm] = useState({
    task_name: "",
    description: "",
    employee_username: "",
    priority: "Medium",
    deadline: "",
  });

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  /* ================= LOAD ================= */

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, uRes] = await Promise.all([
          api.get("/projects"),
          api.get("/admin/users"),
        ]);

        setProjects(pRes.data);
        setUsers(uRes.data.filter((u) => u.role === "employee"));
      } catch (err) {
        console.error(err);
        alert("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const refreshProjects = async () => {
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to refresh projects");
    }
  };

  /* ================= FILTER LOGIC ================= */

  const departments = useMemo(
    () => [...new Set(users.map((u) => u.department))],
    [users],
  );

  const roles = useMemo(() => [...new Set(users.map((u) => u.role))], [users]);

  const filteredUsers = users.filter((u) => {
    return (
      (selectedDept === "All" || u.department === selectedDept) &&
      (selectedRole === "All" || u.role === selectedRole)
    );
  });

  // ✅ FIXED PROJECT FILTER LOGIC
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = (p.project_name || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  /* ================= CREATE PROJECT ================= */

  const handleCreateProject = async () => {
    try {
      const payload = {
        ...formData,
        members: formData.members.map((m) => m.value),
      };

      await api.post("/projects", payload);

      alert("Project Created ✅");

      setShowCreate(false);
      setFormData({
        project_name: "",
        description: "",
        start_date: "",
        due_date: "",
        members: [],
      });

      refreshProjects();
    } catch (err) {
      console.error(err);
      alert("Failed to create project");
    }
  };

  /* ================= VIEW ================= */

  const handleViewProject = async (project) => {
    try {
      const res = await api.get(`/projects/${project.id}`);

      setSelectedProject({
        ...res.data.project,
        members: res.data.members,
        tasks: res.data.tasks,
        stats: res.data.stats,
      });

      setViewMode(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load project details");
    }
  };

  const handleBack = () => {
    setViewMode(false);
    setSelectedProject(null);
  };

  /* ================= TASK ================= */

  const handleCreateTask = async () => {
    try {
      if (!taskForm.employee_username) {
        alert("Please select an employee");
        return;
      }

      if (!taskForm.task_name) {
        alert("Task name is required");
        return;
      }

      const fd = new FormData();
      Object.entries(taskForm).forEach(([k, v]) => fd.append(k, v));
      fd.append("project_id", selectedProject.id);

      await api.post("/tasks", fd);
      alert("Task assigned");

      handleViewProject(selectedProject);

      setTaskForm({
        task_name: "",
        description: "",
        employee_username: "",
        priority: "Medium",
        deadline: "",
      });
    } catch (err) {
      console.error(err);
      alert("Failed to assign task");
    }
  };

  const approveTask = async (id) => {
    try {
      await api.put(`/tasks/admin/approve/${id}`);
      handleViewProject(selectedProject);
      refreshProjects();
    } catch (err) {
      console.error(err);
      alert("Failed to approve task");
    }
  };

  const rejectTask = async (id) => {
    try {
      await api.put(`/tasks/admin/reject/${id}`);
      handleViewProject(selectedProject);
      refreshProjects();
    } catch (err) {
      console.error(err);
      alert("Failed to reject task");
    }
  };

  const projectEmployees = selectedProject?.members || [];

  const updateTask = async () => {
    try {
      await api.put(`/tasks/${editingTask.id}`, editingTask);
      setEditingTask(null);
      handleViewProject(selectedProject);
    } catch (err) {
      console.error(err);
      alert("Failed to update task");
    }
  };

  /* ================= UI ================= */

  if (loading) return <p style={{ padding: "20px" }}>Loading projects...</p>;

  return (
    <AdminLayout>
      <div className="admin-projects">
        <div className="projects-header">
          <h2>
            {viewMode
              ? "Project Details"
              : showCreate
                ? "Create Project"
                : "Projects"}
          </h2>

          {viewMode ? (
            <button className="create-btn" onClick={handleBack}>
              ← Back
            </button>
          ) : (
            !showCreate && (
              <div className="header-right">
                {/* 🔍 Search */}
                <input
                  type="text"
                  placeholder="Search project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* 🎯 Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>

                {/* ➕ Create */}
                <button
                  className="create-btn"
                  onClick={() => setShowCreate(true)}
                >
                  + Create Project
                </button>
              </div>
            )
          )}
        </div>

        {/* ================= CREATE PROJECT ================= */}

        {showCreate && (
          <div className="create-section">
            <h3>Create New Project</h3>

            <div className="form-grid">
              <input
                placeholder="Project Name"
                value={formData.project_name}
                onChange={(e) =>
                  setFormData({ ...formData, project_name: e.target.value })
                }
              />

              <input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
              />

              <textarea
                placeholder="Project Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />

              <input
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>

            <div className="members-section">
              <h4>Assign Employees</h4>

              <div className="filter-row">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                >
                  <option value="All">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <Select
                isMulti
                options={filteredUsers.map((u) => ({
                  value: u.id,
                  label: `${u.username} (${u.department})`,
                }))}
                value={formData.members}
                onChange={(selected) =>
                  setFormData({ ...formData, members: selected })
                }
              />
            </div>

            <div className="form-actions">
              <button onClick={handleCreateProject}>Create Project</button>
              <button
                className="cancel-btn"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ================= PROJECT DETAILS ================= */}

        {viewMode && selectedProject && (
          <div className="project-detail-card">
            <h3>{selectedProject.project_name}</h3>
            <p>{selectedProject.description}</p>

            <div className="progress-section">
              <h4>Progress</h4>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${selectedProject.stats?.progress || 0}%`,
                  }}
                />
              </div>
              <p>{selectedProject.stats?.progress || 0}% Completed</p>
            </div>

            <div className="create-task-form">
              <h4>Create Task</h4>

              <input
                placeholder="Task Name"
                value={taskForm.task_name}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, task_name: e.target.value })
                }
              />

              <textarea
                placeholder="Description"
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, description: e.target.value })
                }
              />

              <select
                value={taskForm.employee_username}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    employee_username: e.target.value,
                  })
                }
              >
                <option value="">Assign Employee</option>
                {projectEmployees.map((emp) => (
                  <option key={emp.id} value={emp.username}>
                    {emp.username}
                  </option>
                ))}
              </select>

              <select
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, priority: e.target.value })
                }
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>

              <input
                type="date"
                value={taskForm.deadline}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, deadline: e.target.value })
                }
              />

              <button onClick={handleCreateTask}>Assign Task</button>
            </div>

            <div className="task-section">
              <h4>Tasks</h4>

              {selectedProject.tasks?.length === 0 ? (
                <p>No tasks assigned</p>
              ) : (
                selectedProject.tasks.map((t) => (
                  <div key={t.id} className="task-card">
                    <h5>{t.task_name}</h5>
                    <p>👤 {t.employee_username}</p>

                    <span>{t.status}</span>

                    {t.submitted_file && (
                      <a
                        href={`http://localhost:5000/uploads/${t.submitted_file}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Submission
                      </a>
                    )}
                    {t.status !== "Completed" && (
                      <button onClick={() => setEditingTask(t)}>Edit</button>
                    )}
                    {t.status === "Submitted" && (
                      <>
                        <button onClick={() => approveTask(t.id)}>
                          Approve
                        </button>
                        <button onClick={() => rejectTask(t.id)}>Reject</button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= PROJECT LIST ================= */}
        {!viewMode && !showCreate && (
          <div className="projects-list">
            {filteredProjects.length === 0 ? (
              <p>No matching projects</p>
            ) : (
              filteredProjects.map((p) => {
                const status = p.status;

                return (
                  <div
                    key={p.id}
                    className="project-card"
                    onClick={() => handleViewProject(p)}
                  >
                    <div className="project-top">
                      <h3>{p.project_name}</h3>

                      <span
                        className={`status-badge ${status.replace(" ", "")}`}
                      >
                        {status}
                      </span>
                    </div>

                    <p className="project-desc">{p.description}</p>

                    <div className="project-footer">
                      {p.stats?.progress || p.progress || 0}% Completed →
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ✅ ONLY ADDED THIS MODAL */}
      {editingTask && (
        <div className="modal">
          <div className="modal-content">
            <h3>Edit Task</h3>

            <input
              value={editingTask.task_name}
              onChange={(e) =>
                setEditingTask({
                  ...editingTask,
                  task_name: e.target.value,
                })
              }
            />

            <textarea
              value={editingTask.description}
              onChange={(e) =>
                setEditingTask({
                  ...editingTask,
                  description: e.target.value,
                })
              }
            />

            <select
              value={editingTask.employee_username}
              onChange={(e) =>
                setEditingTask({
                  ...editingTask,
                  employee_username: e.target.value,
                })
              }
            >
              {projectEmployees.map((emp) => (
                <option key={emp.id} value={emp.username}>
                  {emp.username}
                </option>
              ))}
            </select>

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

            <input
              type="date"
              value={
                editingTask.deadline ? editingTask.deadline.split("T")[0] : ""
              }
              onChange={(e) =>
                setEditingTask({
                  ...editingTask,
                  deadline: e.target.value,
                })
              }
            />

            <div className="modal-actions">
              <button onClick={updateTask}>Save</button>
              <button onClick={() => setEditingTask(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProjects;
