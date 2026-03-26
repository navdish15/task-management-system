import { useEffect, useState } from "react";
import api from "../../services/api";
import EmployeeLayout from "../../components/EmployeeLayout";
import "../../assets/employeeProjects.css";

const EmployeeProjects = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState({});
  const [submissionText, setSubmissionText] = useState({});

  /* ================= LOAD PROJECTS ================= */
  useEffect(() => {
    let ignore = false;

    const loadProjects = async () => {
      try {
        const res = await api.get("/projects");
        if (!ignore) setProjects(res.data);
      } catch (error) {
        console.error("Project load error:", error);
      }
    };

    loadProjects();
    return () => (ignore = true);
  }, []);

  /* ================= VIEW PROJECT ================= */
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
    } catch (error) {
      console.error("Project detail error:", error);
    }
  };

  const handleBack = () => {
    setViewMode(false);
    setSelectedProject(null);
  };

  /* ================= SUBMIT WORK ================= */
  const handleSubmit = async (taskId) => {
    const file = selectedFiles[taskId];
    const text = submissionText[taskId];

    if (!file && !text) {
      alert("Add file or text");
      return;
    }

    const formData = new FormData();
    if (file) formData.append("file", file);
    if (text) formData.append("text", text);

    try {
      await api.post(`/tasks/employee/submit/${taskId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Submitted successfully");

      // reload project
      const res = await api.get(`/projects/${selectedProject.id}`);
      setSelectedProject({
        ...res.data.project,
        members: res.data.members,
        tasks: res.data.tasks,
        stats: res.data.stats,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <EmployeeLayout>
      <div className="admin-projects">
        {/* ================= HEADER ================= */}
        <div className="projects-header">
          <h2>{viewMode ? "Project Details" : "My Projects"}</h2>

          {viewMode && (
            <button className="create-btn" onClick={handleBack}>
              ← Back
            </button>
          )}
        </div>

        {/* ================= PROJECT DETAIL ================= */}
        {viewMode && selectedProject && (
          <div className="project-detail-card">
            {/* TOP */}
            <div className="detail-top">
              <h3>{selectedProject.project_name}</h3>

              <span
                className={`status-badge ${selectedProject.status.replace(" ", "")}`}
              >
                {selectedProject.status}
              </span>
            </div>

            {/* DESC */}
            <p className="project-desc">{selectedProject.description}</p>

            {/* INFO */}
            <div className="detail-info">
              <div>
                <strong>Start:</strong>{" "}
                {selectedProject.start_date?.split("T")[0]}
              </div>

              <div>
                <strong>Due:</strong> {selectedProject.due_date?.split("T")[0]}
              </div>

              <div>
                <strong>Members:</strong> {selectedProject.members?.length || 0}
              </div>

              <div>
                <strong>Total Tasks:</strong>{" "}
                {selectedProject.stats?.totalTasks || 0}
              </div>
            </div>

            {/* ================= PROGRESS ================= */}
            {selectedProject.stats && (
              <div className="progress-section">
                <h4>Project Progress</h4>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${selectedProject.stats.progress}%`,
                    }}
                  ></div>
                </div>

                <p>{selectedProject.stats.progress}% Completed</p>
              </div>
            )}

            {/* ================= TASKS ================= */}
            <div className="task-section">
              <h4>Tasks</h4>

              {selectedProject.tasks?.length === 0 ? (
                <p>No tasks assigned yet.</p>
              ) : (
                selectedProject.tasks.map((task) => (
                  <div key={task.id} className="task-card">
                    {/* TASK NAME */}
                    <h5>{task.task_name}</h5>

                    {/* STATUS */}
                    <span
                      className={`task-status ${task.status.replace(" ", "")}`}
                    >
                      {task.status}
                    </span>

                    {/* DESCRIPTION */}
                    <p className="project-desc">{task.description}</p>

                    {/* FILE */}
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

                    {/* ================= SUBMIT UI ================= */}
                    {!task.submitted_file && (
                      <div className="submit-box">
                        <textarea
                          placeholder="Write your submission..."
                          onChange={(e) =>
                            setSubmissionText((prev) => ({
                              ...prev,
                              [task.id]: e.target.value,
                            }))
                          }
                        />

                        <input
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
                          onClick={() => handleSubmit(task.id)}
                        >
                          Submit Work
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
        {!viewMode && (
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
                      className={`status-badge ${project.status.replace(
                        " ",
                        "",
                      )}`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <p className="project-desc">{project.description}</p>

                  <div className="project-footer">
                    📅 {project.start_date?.split("T")[0]} →{" "}
                    {project.due_date?.split("T")[0]}
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
