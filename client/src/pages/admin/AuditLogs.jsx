import { useEffect, useState } from "react";
import api from "../../services/api";
import AdminLayout from "../../components/AdminLayout";

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const logsPerPage = 5;

  /* ================= FETCH LOGS ================= */

  useEffect(() => {
    api
      .get("/admin/audit-logs")
      .then((res) => setLogs(res.data))
      .catch((err) => console.error(err));
  }, []);

  /* ================= SEARCH FILTER ================= */

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.performed_by.toLowerCase().includes(search.toLowerCase()) ||
      log.role.toLowerCase().includes(search.toLowerCase()),
  );

  /* ================= PAGINATION ================= */

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  return (
    <AdminLayout>
      <div className="users-container">
        {/* HEADER */}
        <div className="users-header">
          <div>
            <h2>Audit Logs</h2>
            <p>Track all system activities.</p>
          </div>

          <div className="search-inline">
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Action</th>
                <th>Performed By</th>
                <th>Role</th>
                <th>Timestamp</th>
              </tr>
            </thead>

            <tbody>
              {currentLogs.length === 0 ? (
                <tr>
                  <td colSpan="5">No logs found</td>
                </tr>
              ) : (
                currentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.id}</td>
                    <td>{log.action}</td>
                    <td>{log.performed_by}</td>
                    <td>{log.role}</td>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
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
    </AdminLayout>
  );
}

export default AuditLogs;
