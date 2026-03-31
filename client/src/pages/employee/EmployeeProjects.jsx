import { useEffect, useState } from "react";
import api from "../../services/api";
import EmployeeLayout from "../../components/EmployeeLayout";
import "../../assets/employeeProjects.css";

const EmployeeProjects = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submittingTaskId, setSubmittingTaskId] = useState(null);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedFiles, setSelectedFiles] = useState({});
  const [submissionText, setSubmissionText] = useState({});

  /* ================= LOAD PROJECTS ================= */
  useEffect(() => {
    let ignore = false;

    const loadProjects = async () => {
      try {
        const res = await api.get("/projects");
        if (!ignore) setProjects(res.data || []);
      } catch (error) {
        console.error(error);
        setError("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
    return () => (ignore = true);
  }, []);

  /* ================= AUTO CLEAR SUCCESS ================= */
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  /* ================= VIEW PROJECT ================= */
  const handleViewProject = async (project) => {
    try {
      setError("");
      const res = await api.get(`/projects/${project.id}`);

      setSelectedProject({
        ...res.data.project,
        members: res.data.members || [],
        tasks: res.data.tasks || [],
        stats: res.data.stats || {},
      });

      setViewMode(true);
    } catch (error) {
      console.error(error);
      setError("Failed to load project details");
    }
  };

  const handleBack = () => {
    setViewMode(false);
    setSelectedProject(null);
    setError("");
    setSuccessMsg("");
  };

  /* ================= SUBMIT WORK ================= */
  const handleSubmit = async (taskId) => {
    const file = selectedFiles[taskId];
    const text = submissionText[taskId];

    if (!file && !text) {
      setError("Please add file or text before submitting");
      return;
    }

    const formData = new FormData();
    if (file) formData.append("file", file);
    if (text) formData.append("text", text);

    try {
      setSubmittingTaskId(taskId);
      setError("");
      setSuccessMsg("");

      await api.post(`/tasks/employee/submit/${taskId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessMsg("Work submitted successfully ✅");

      // reload project
      const res = await api.get(`/projects/${selectedProject.id}`);
      setSelectedProject({
        ...res.data.project,
        members: res.data.members || [],
        tasks: res.data.tasks || [],
        stats: res.data.stats || {},
      });

      // reset inputs
      setSelectedFiles((prev) => ({ ...prev, [taskId]: null }));
      setSubmissionText((prev) => ({ ...prev, [taskId]: "" }));
    } catch (err) {
      console.error(err);
      setError("Submission failed. Try again.");
    } finally {
      setSubmittingTaskId(null);
    }
  };

  /* ================= HELPERS ================= */

  const formatStatus = (status) =>
    status?.replace(/\s+/g, "").toLowerCase() || "pending";

  const formatDate = (date) => date?.split("T")[0] || "-";

  /* ================= RENDER ================= */

  return (
    <EmployeeLayout>
      <div className="admin-projects">
        {/* HEADER */}
        <div className="projects-header">
          <h2>{viewMode ? "Project Details" : "My Projects"}</h2>

          {viewMode && (
            <button className="create-btn" onClick={handleBack}>
              ← Back
            </button>
          )}
        </div>

        {/* 🔥 FIXED MESSAGE HANDLING */}
        {error ? (
          <p className="error-msg">{error}</p>
        ) : successMsg ? (
          <p className="success-msg">{successMsg}</p>
        ) : null}

        {/* LOADING */}
        {!viewMode && loading && <p>Loading projects...</p>}

        {/* ================= PROJECT DETAIL ================= */}
        {viewMode && selectedProject && (
          <div className="project-detail-card">
            <div className="detail-top">
              <h3>{selectedProject.project_name}</h3>

              <span
                className={`status-badge ${formatStatus(selectedProject.status)}`}
              >
                {selectedProject.status}
              </span>
            </div>

            <p className="project-desc">{selectedProject.description}</p>

            <div className="detail-info">
              <div>
                <strong>Start:</strong> {formatDate(selectedProject.start_date)}
              </div>
              <div>
                <strong>Due:</strong> {formatDate(selectedProject.due_date)}
              </div>
              <div>
                <strong>Members:</strong> {selectedProject.members.length}
              </div>
              <div>
                <strong>Total Tasks:</strong>{" "}
                {selectedProject.stats.totalTasks || 0}
              </div>
            </div>

            {/* PROGRESS */}
            <div className="progress-section">
              <h4>Project Progress</h4>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${selectedProject.stats.progress || 0}%` }}
                />
              </div>

              <p>{selectedProject.stats.progress || 0}% Completed</p>
            </div>

            {/* TASKS */}
            <div className="task-section">
              <h4>Tasks</h4>

              {selectedProject.tasks.length === 0 ? (
                <p className="empty">🎉 No tasks assigned yet.</p>
              ) : (
                selectedProject.tasks.map((task) => (
                  <div key={task.id} className="task-card">
                    <h5>{task.task_name}</h5>

                    <span
                      className={`task-status ${formatStatus(task.status)}`}
                    >
                      {task.status}
                    </span>

                    <p className="project-desc">{task.description}</p>

                    <div className="task-meta">
                      <div>
                        <strong>File:</strong>{" "}
                        {task.submitted_file ? (
                          <a
                            href={`http://localhost:5000/uploads/${task.submitted_file}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View Submission
                          </a>
                        ) : (
                          "No submission"
                        )}
                      </div>

                      <div>
                        <strong>Text:</strong> {task.submission_text || "—"}
                      </div>
                    </div>

                    {!task.submitted_file && (
                      <div className="submit-box">
                        <textarea
                          placeholder="Write your submission..."
                          value={submissionText[task.id] || ""}
                          onChange={(e) =>
                            setSubmissionText((prev) => ({
                              ...prev,
                              [task.id]: e.target.value,
                            }))
                          }
                        />

                        <input
                          key={task.id} /* 🔥 FIX reset file input */
                          type="file"
                          onChange={(e) =>
                            setSelectedFiles((prev) => ({
                              ...prev,
                              [task.id]: e.target.files[0],
                            }))
                          }
                        />

                        <button
                          className="task-submit-btn"
                          disabled={submittingTaskId === task.id}
                          onClick={() => handleSubmit(task.id)}
                        >
                          {submittingTaskId === task.id
                            ? "Submitting..."
                            : "Submit Work"}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= PROJECT LIST ================= */}
        {!viewMode && !loading && (
          <div className="projects-list">
            {projects.length === 0 ? (
              <div className="empty-state">
                <h3>No Projects Assigned</h3>
                <p>Your admin will assign projects to you.</p>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="project-card"
                  onClick={() => handleViewProject(project)}
                >
                  <div className="project-top">
                    <h3>{project.project_name}</h3>

                    <span
                      className={`status-badge ${formatStatus(project.status)}`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <p className="project-desc">{project.description}</p>

                  <div className="project-footer">
                    📅 {formatDate(project.start_date)} →{" "}
                    {formatDate(project.due_date)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeProjects;
