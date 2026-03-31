import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import EmployeeLayout from "../../components/EmployeeLayout";
import "../../assets/MyTasks.css";

function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedFiles, setSelectedFiles] = useState({});
  const [submissionText, setSubmissionText] = useState({});

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submittingId, setSubmittingId] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;

  /* ================= FETCH TASKS ================= */

  const fetchTasks = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/employee/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTasks(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /* ================= AUTO CLEAR SUCCESS ================= */

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  /* ================= UPDATE STATUS ================= */

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(
        `http://localhost:5000/api/tasks/employee/status/${id}`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchTasks();
    } catch (err) {
      console.error(err);
      setError("Failed to update status");
    }
  };

  /* ================= SUBMIT WORK ================= */

  const handleFileUpload = async (taskId) => {
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
      setSubmittingId(taskId);
      setError("");
      setSuccessMsg("");

      await axios.post(
        `http://localhost:5000/api/tasks/employee/submit/${taskId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setSuccessMsg("Work submitted successfully ✅");

      // refresh tasks
      fetchTasks();

      // reset inputs
      setSelectedFiles((prev) => ({ ...prev, [taskId]: null }));
      setSubmissionText((prev) => ({ ...prev, [taskId]: "" }));
    } catch (err) {
      console.error(err);
      setError("Submission failed. Try again.");
    } finally {
      setSubmittingId(null);
    }
  };

  /* ================= HELPERS ================= */

  const formatStatus = (status) =>
    status?.replace(/\s+/g, "").toLowerCase() || "pending";

  const formatPriority = (priority) => (priority || "low").toLowerCase();

  /* ================= COUNTS ================= */

  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === "Pending").length;
  const progress = tasks.filter((t) => t.status === "In Progress").length;
  const completed = tasks.filter((t) => t.status === "Completed").length;

  /* ================= RENDER ================= */

  return (
    <EmployeeLayout>
      <div className="mytasks-container">
        <h2 className="page-title">📋 My Tasks</h2>

        {/* 🔥 MESSAGES */}
        {error ? (
          <p className="error-msg">{error}</p>
        ) : successMsg ? (
          <p className="success-msg">{successMsg}</p>
        ) : null}

        {/* SUMMARY */}
        <div className="task-summary">
          <span className="chip total">{total} Total</span>
          <span className="chip pending">{pending} Pending</span>
          <span className="chip progress">{progress} In Progress</span>
          <span className="chip completed">{completed} Completed</span>
        </div>

        {/* LOADING */}
        {loading ? (
          <p className="no-data">Loading...</p>
        ) : tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`jira-card ${formatPriority(task.priority)}`}
            >
              {/* LEFT */}
              <div className="jira-left">
                <h3 className="task-title">{task.task_name}</h3>
                <p className="task-desc">{task.description}</p>

                <div className="task-meta">
                  <span>
                    📅{" "}
                    {task.deadline
                      ? new Date(task.deadline).toLocaleString()
                      : "N/A"}
                  </span>

                  <span
                    className={`priority-badge ${formatPriority(task.priority)}`}
                  >
                    {task.priority || "Low"}
                  </span>

                  <span className={`status-badge ${formatStatus(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </div>

              {/* RIGHT */}
              <div className="jira-right">
                {/* STATUS */}
                <select
                  className="status-select"
                  value={task.status}
                  onChange={(e) => updateStatus(task.id, e.target.value)}
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>

                {/* FILE */}
                {task.uploaded_file ? (
                  <a
                    className="download-link"
                    href={`http://localhost:5000/uploads/${task.uploaded_file}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    📄 Download File
                  </a>
                ) : (
                  <span className="no-file">No File</span>
                )}

                {/* SUBMIT */}
                <div className="submit-box">
                  {task.submitted_file && (
                    <a
                      className="submitted-link"
                      href={`http://localhost:5000/uploads/${task.submitted_file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      👁 View Submitted
                    </a>
                  )}

                  <textarea
                    placeholder="Describe your work..."
                    disabled={task.submitted_file}
                    value={submissionText[task.id] || ""}
                    onChange={(e) =>
                      setSubmissionText((prev) => ({
                        ...prev,
                        [task.id]: e.target.value,
                      }))
                    }
                  />

                  <input
                    key={task.id} /* reset file input */
                    type="file"
                    disabled={task.submitted_file}
                    onChange={(e) =>
                      setSelectedFiles((prev) => ({
                        ...prev,
                        [task.id]: e.target.files[0],
                      }))
                    }
                  />

                  <button
                    className="submit-btn"
                    disabled={task.submitted_file || submittingId === task.id}
                    onClick={() => handleFileUpload(task.id)}
                  >
                    {task.submitted_file
                      ? "Submitted"
                      : submittingId === task.id
                        ? "Submitting..."
                        : "Submit Work"}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="no-data">🎉 No tasks assigned</p>
        )}
      </div>
    </EmployeeLayout>
  );
}

export default MyTasks;
