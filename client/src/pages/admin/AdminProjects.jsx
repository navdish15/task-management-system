import React, { useEffect, useState } from "react";
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
      }
    };

    load();
  }, []);

  const refreshProjects = async () => {
    const res = await api.get("/projects");
    setProjects(res.data);
  };

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
    }
  };

  /* ================= VIEW ================= */

  const handleViewProject = async (project) => {
    const res = await api.get(`/projects/${project.id}`);

    setSelectedProject({
      ...res.data.project,
      members: res.data.members,
      tasks: res.data.tasks,
      stats: res.data.stats,
    });

    setViewMode(true);
  };

  const handleBack = () => {
    setViewMode(false);
    setSelectedProject(null);
  };

  /* ================= TASK ================= */

  const handleCreateTask = async () => {
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
  };

  const approveTask = async (id) => {
    await api.put(`/tasks/admin/approve/${id}`);
    handleViewProject(selectedProject);
    refreshProjects(); // 🔥 IMPORTANT (sync list)
  };

  const rejectTask = async (id) => {
    await api.put(`/tasks/admin/reject/${id}`);
    handleViewProject(selectedProject);
    refreshProjects();
  };

  const projectEmployees = users.filter((u) =>
    selectedProject?.members?.some((m) => m.id === u.id),
  );

  /* ================= UI ================= */

  return (
    <AdminLayout>
      <div className="admin-projects">
        {/* HEADER */}
        <div className="projects-header">
          <h2>
            {viewMode
              ? "Project Details"
              : showCreate
                ? "Create Project"
                : "Projects"}
          </h2>

          {viewMode && (
            <button className="create-btn" onClick={handleBack}>
              ← Back
            </button>
          )}

          {!viewMode && !showCreate && (
            <button className="create-btn" onClick={() => setShowCreate(true)}>
              + Create Project
            </button>
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

              <Select
                isMulti
                options={users.map((u) => ({
                  value: u.id,
                  label: u.username,
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

            {/* PROGRESS */}
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

            {/* CREATE TASK */}
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

            {/* TASK LIST */}
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
            {projects.map((p) => {
              const status = p.status; // ✅ FIXED

              return (
                <div
                  key={p.id}
                  className="project-card"
                  onClick={() => handleViewProject(p)}
                >
                  <div className="project-top">
                    <h3>{p.project_name}</h3>

                    <span className={`status-badge ${status.replace(" ", "")}`}>
                      {status}
                    </span>
                  </div>

                  <p className="project-desc">{p.description}</p>

                  <div className="project-footer">
                    {p.progress || 0}% Completed →
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProjects;
