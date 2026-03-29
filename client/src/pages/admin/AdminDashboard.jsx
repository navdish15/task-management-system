import { useEffect, useState } from "react";
import axios from "axios";
import "./AdminDashboard.css";
import AdminLayout from "../../components/AdminLayout";
import { Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
} from "chart.js";
import { useNavigate } from "react-router-dom";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
);

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;

  useEffect(() => {
    if (!token) return;

    async function loadData() {
      try {
        const dashboardRes = await axios.get(
          "http://localhost:5000/api/admin/dashboard",
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const analyticsRes = await axios.get(
          "http://localhost:5000/api/admin/analytics",
          { headers: { Authorization: `Bearer ${token}` } },
        );

        setDashboard(dashboardRes.data);
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  if (loading) {
    return (
      <AdminLayout>
        <p style={{ padding: "20px" }}>Loading dashboard...</p>
      </AdminLayout>
    );
  }

  const projectStats = analytics?.projectStats || {
    total: 0,
    completed: 0,
    active: 0,
  };

  /* ================= DOUGHNUT ================= */
  const statusChartData = {
    labels: analytics?.statusData?.map((i) => i.status) || [],
    datasets: [
      {
        data: analytics?.statusData?.map((i) => i.count) || [],
        backgroundColor: ["#28a745", "#ffc107", "#dc3545"],
        borderWidth: 2,
      },
    ],
  };

  /* ================= LINE CHART ================= */
  const efficiencyData =
    analytics?.monthlyData?.map((i) => {
      const assigned = i.assigned || i.total || 0;
      const completed = i.completed || 0;

      if (assigned === 0) return 0;
      return Math.round((completed / assigned) * 100);
    }) || [];

  const monthlyChartData = {
    labels: analytics?.monthlyData?.map((i) => i.month) || [],
    datasets: [
      {
        label: "Efficiency %",
        data: efficiencyData,
        borderColor: "#4e73df",
        backgroundColor: "rgba(78,115,223,0.1)",
        tension: 0, // 🔥 straight line (clear up/down)
        fill: false,

        pointRadius: 7,
        pointHoverRadius: 9,

        // 🔥 Color points based on trend
        pointBackgroundColor: efficiencyData.map((val, i) => {
          if (i === 0) return "#4e73df";
          return val >= efficiencyData[i - 1] ? "#28a745" : "#dc3545";
        }),
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.raw}%`,
        },
      },
    },

    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },

    elements: {
      line: {
        borderWidth: 3,
      },
    },
  };

  const getEfficiencyColor = (eff) => {
    if (eff >= 80) return "green";
    if (eff >= 50) return "orange";
    return "red";
  };

  return (
    <AdminLayout>
      <div className="dashboard-container">
        <h2>🚀 Admin Analytics Dashboard</h2>

        {/* CARDS */}
        <div className="cards">
          <div className="card green" onClick={() => navigate("/admin/tasks")}>
            <h3>Total Tasks</h3>
            <p>{dashboard?.totalTasks || 0}</p>
          </div>

          <div className="card pink" onClick={() => navigate("/admin/tasks")}>
            <h3>Pending Tasks</h3>
            <p>{dashboard?.pendingTasks || 0}</p>
          </div>

          <div className="card yellow" onClick={() => navigate("/admin/tasks")}>
            <h3>Completed Tasks</h3>
            <p>{dashboard?.completedTasks || 0}</p>
          </div>

          <div className="card teal" onClick={() => navigate("/admin/users")}>
            <h3>Total Employees</h3>
            <p>{dashboard?.totalEmployees || 0}</p>
          </div>
        </div>

        {/* PROJECT CARDS */}
        <div className="cards" style={{ marginTop: "20px" }}>
          <div className="card blue">
            <h3>Total Projects</h3>
            <p>{projectStats.total}</p>
          </div>

          <div className="card green">
            <h3>Completed Projects</h3>
            <p>{projectStats.completed}</p>
          </div>

          <div className="card orange">
            <h3>Active Projects</h3>
            <p>{projectStats.active}</p>
          </div>
        </div>

        {/* CHARTS */}
        <div className="chart-container">
          <div className="chart-box">
            <h3>Task Status Overview</h3>
            <Doughnut data={statusChartData} />
          </div>

          <div className="chart-box">
            <h3>Monthly Efficiency Trend (%)</h3>
            <Line data={monthlyChartData} options={chartOptions} />
          </div>
        </div>

        {/* UPCOMING */}
        <div className="section-card">
          <h3>📅 Upcoming Deadlines</h3>
          {analytics?.upcomingTasks?.length > 0 ? (
            <ul className="task-list">
              {analytics.upcomingTasks.map((task, i) => (
                <li key={i}>
                  <strong>{task.task_name}</strong>
                  <span>{task.employee_username}</span>
                  <small>{new Date(task.deadline).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">No upcoming tasks</p>
          )}
        </div>

        {/* OVERDUE */}
        <div className="section-card overdue-card">
          <h3>⚠️ Overdue Tasks</h3>
          {analytics?.overdueTasks?.length > 0 ? (
            <ul className="task-list">
              {analytics.overdueTasks.map((task, i) => (
                <li key={i} className="overdue-item">
                  <strong>{task.task_name}</strong>
                  <span>{task.employee_username}</span>
                  <small>{new Date(task.deadline).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">No overdue tasks 🎉</p>
          )}
        </div>

        {/* EMPLOYEE TABLE */}
        <div className="section-card">
          <h3>👨‍💻 Employee Performance</h3>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Assigned</th>
                <th>Completed</th>
                <th>Efficiency</th>
              </tr>
            </thead>

            <tbody>
              {analytics?.employeePerformance?.map((emp, i) => {
                const efficiency =
                  emp.assigned === 0
                    ? 0
                    : Math.round((emp.completed / emp.assigned) * 100);

                return (
                  <tr key={i}>
                    <td>{emp.employee_username}</td>
                    <td>{emp.assigned}</td>
                    <td>{emp.completed}</td>
                    <td>
                      <span
                        className={`badge ${getEfficiencyColor(efficiency)}`}
                      >
                        {efficiency}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
