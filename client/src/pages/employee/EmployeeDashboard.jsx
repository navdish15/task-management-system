import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import EmployeeLayout from "../../components/EmployeeLayout";
import "../../assets/EmployeeDashboard.css";

function EmployeeDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;
  const username = user?.username;

  /* ================= FETCH ================= */

  const fetchTasks = useCallback(async () => {
    if (!token) return;

    try {
      const res = await axios.get("http://localhost:5000/api/employee/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /* ================= STATS ================= */

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const pendingTasks = tasks.filter((t) => t.status === "Pending").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "In Progress",
  ).length;

  /* ================= ACTIVE TASKS ================= */

  const activeTasks = tasks.filter(
    (t) => t.status === "Pending" || t.status === "In Progress",
  );

  /* ================= TODAY TASKS ================= */

  const today = new Date().toDateString();

  const todayTasks = tasks.filter(
    (t) => t.deadline && new Date(t.deadline).toDateString() === today,
  );

  /* ================= DEADLINE ALERTS (FIXED) ================= */

  const urgentTasks = tasks.filter((task) => {
    if (!task.deadline) return false;

    const deadline = new Date(task.deadline);
    const now = new Date();
    const diff = deadline - now;

    return (
      diff > 0 &&
      diff <= 24 * 60 * 60 * 1000 &&
      deadline.toDateString() !== today && // ❌ remove today's duplicates
      task.status !== "Completed"
    );
  });

  /* ================= RECENT ================= */

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.deadline) - new Date(a.deadline))
    .slice(0, 5);

  /* ================= WEEKLY ================= */

  const weeklyCompleted = completedTasks;
  const weeklyPending = pendingTasks;

  return (
    <EmployeeLayout>
      <div className="employee-dashboard">
        {/* HEADER */}
        <div className="dashboard-header">
          <h2>Welcome, {username} 👋</h2>
          <p>Here’s your work overview.</p>
        </div>

        {/* CARDS */}
        <div className="dashboard-cards">
          <div className="dashboard-card blue">
            <h3>Total Tasks</h3>
            <p>{totalTasks}</p>
          </div>

          <div className="dashboard-card green">
            <h3>Completed</h3>
            <p>{completedTasks}</p>
          </div>

          <div className="dashboard-card orange">
            <h3>In Progress</h3>
            <p>{inProgressTasks}</p>
          </div>

          <div className="dashboard-card red">
            <h3>Pending</h3>
            <p>{pendingTasks}</p>
          </div>
        </div>

        {/* PROGRESS */}
        <div className="progress-box">
          <div className="progress-title">
            Progress: {completedTasks}/{totalTasks}
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${totalTasks ? (completedTasks / totalTasks) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>

        {/* ACTIVE TASKS */}
        <div className="section">
          <h3>🔥 Active Tasks</h3>
          {activeTasks.length > 0 ? (
            activeTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="task-row">
                <span>{task.task_name}</span>
                <span className="status-badge small">{task.status}</span>
              </div>
            ))
          ) : (
            <p className="empty">No active tasks</p>
          )}
        </div>

        {/* DEADLINE ALERTS */}
        <div className="section">
          <h3>⚠️ Deadline Alerts</h3>
          {urgentTasks.length > 0 ? (
            urgentTasks.map((task) => (
              <div key={task.id} className="task-row urgent">
                <span>{task.task_name}</span>
                <small>{new Date(task.deadline).toLocaleString()}</small>
              </div>
            ))
          ) : (
            <p className="empty">No urgent tasks</p>
          )}
        </div>

        {/* TODAY TASKS */}
        <div className="section">
          <h3>📅 Today’s Tasks</h3>
          {todayTasks.length > 0 ? (
            todayTasks.map((task) => (
              <div key={task.id} className="task-row">
                <span>{task.task_name}</span>
                <small>{new Date(task.deadline).toLocaleTimeString()}</small>
              </div>
            ))
          ) : (
            <p className="empty">No tasks today</p>
          )}
        </div>

        {/* WEEKLY INSIGHT */}
        <div className="insight-box">
          📊 This week: {weeklyCompleted} completed, {weeklyPending} pending
        </div>

        {/* RECENT TASKS */}
        <div className="recent-tasks">
          <h3>Recent Tasks</h3>

          <div className="table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4">Loading...</td>
                  </tr>
                ) : recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.task_name}</td>
                      <td>{new Date(task.deadline).toLocaleString()}</td>
                      <td>
                        <span
                          className={`priority-badge ${task.priority.toLowerCase()}`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${task.status.replace(" ", "").toLowerCase()}`}
                        >
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">No tasks</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
}

export default EmployeeDashboard;
