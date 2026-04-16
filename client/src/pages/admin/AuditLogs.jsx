import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import AdminLayout from "../../components/AdminLayout";
import socket from "../../services/socket";
import "../../assets/auditLogs.css";

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const logsPerPage = 5;

  /* ================= FETCH ================= */
  useEffect(() => {
    let active = true;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await api.get("/admin/audit-logs");

        if (active) {
          setLogs(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error("Audit logs error:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchLogs();

    /* ================= SOCKET ================= */
    const handleNewLog = (newLog) => {
      setLogs((prev) => [newLog, ...prev]);
      setCurrentPage(1); // 🔥 always show latest
    };

    // ✅ prevent duplicate listeners
    socket.off("new_log", handleNewLog);
    socket.on("new_log", handleNewLog);

    return () => {
      active = false;
      socket.off("new_log", handleNewLog);
    };
  }, []);

  /* ================= FILTER ================= */
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const action = (log.action || "").toLowerCase();
      const user = (log.performed_by || "").toLowerCase();
      const role = (log.role || "").toLowerCase();

      const matchesSearch =
        action.includes(search.toLowerCase()) ||
        user.includes(search.toLowerCase());

      const matchesRole = roleFilter ? role === roleFilter.toLowerCase() : true;

      const matchesAction = actionFilter
        ? action.includes(actionFilter.toLowerCase())
        : true;

      const matchesDate =
        dateFilter && log.created_at
          ? new Date(log.created_at).toDateString() ===
            new Date(dateFilter).toDateString()
          : true;

      return matchesSearch && matchesRole && matchesAction && matchesDate;
    });
  }, [logs, search, roleFilter, actionFilter, dateFilter]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage));

  const indexOfLastLog = currentPage * logsPerPage;
  const currentLogs = filteredLogs.slice(
    indexOfLastLog - logsPerPage,
    indexOfLastLog,
  );

  /* ================= EXPORT ================= */
  const exportCSV = () => {
    const headers = ["ID", "Action", "User", "Role", "Timestamp"];

    const rows = filteredLogs.map((log) => [
      log.id,
      log.action,
      log.performed_by,
      log.role,
      log.created_at,
    ]);

    const csv =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "audit_logs.csv";
    link.click();
  };

  return (
    <AdminLayout>
      <div className="users-container">
        {/* HEADER */}
        <div className="users-header">
          <div>
            <h2>📊 Audit Logs Dashboard</h2>
            <p>Track system activity in real-time</p>
          </div>

          <button className="export-btn" onClick={exportCSV}>
            Export CSV
          </button>
        </div>

        {/* FILTERS */}
        <div className="filters">
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>

          <input
            type="text"
            placeholder="Filter by action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        {/* STATS */}
        <div className="stats-cards">
          <div className="card">
            <h3>Total Logs</h3>
            <p>{logs.length}</p>
          </div>
          <div className="card">
            <h3>Filtered</h3>
            <p>{filteredLogs.length}</p>
          </div>
        </div>

        {/* TIMELINE */}
        <div className="timeline">
          {loading ? (
            <p className="loading-text">⏳ Loading logs...</p>
          ) : currentLogs.length === 0 ? (
            <p>No logs found</p>
          ) : (
            currentLogs.map((log) => (
              <div key={log.id} className="timeline-item">
                <div className="timeline-dot"></div>

                <div className="timeline-content">
                  <h4>{log.action || "N/A"}</h4>
                  <p>
                    👤 {log.performed_by || "Unknown"} | 🛡 {log.role || "N/A"}
                  </p>
                  <small>
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString()
                      : "N/A"}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PAGINATION */}
        {filteredLogs.length > 0 && (
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
        )}
      </div>
    </AdminLayout>
  );
}

export default AuditLogs;
