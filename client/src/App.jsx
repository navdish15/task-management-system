import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";

import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import Tasks from "./pages/admin/Tasks";
import AuditLogs from "./pages/admin/AuditLogs";
import AdminProjects from "./pages/admin/AdminProjects";

import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import MyTasks from "./pages/employee/MyTasks";
import EmployeeProjects from "./pages/employee/EmployeeProjects";

import PrivateRoute from "./components/PrivateRoute";
import RoleRoute from "./components/RoleRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= PUBLIC ROUTES ================= */}

        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* ================= ADMIN ROUTES ================= */}

        <Route
          path="/admin-dashboard"
          element={
            <PrivateRoute>
              <RoleRoute allowedRole="admin">
                <AdminDashboard />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <PrivateRoute>
              <RoleRoute allowedRole="admin">
                <Users />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/tasks"
          element={
            <PrivateRoute>
              <RoleRoute allowedRole="admin">
                <Tasks />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/audit"
          element={
            <PrivateRoute>
              <RoleRoute allowedRole="admin">
                <AuditLogs />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/projects"
          element={
            <PrivateRoute>
              <RoleRoute allowedRole="admin">
                <AdminProjects />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        {/* ================= EMPLOYEE ROUTES ================= */}

        <Route
          path="/employee-dashboard"
          element={
            <PrivateRoute>
              <RoleRoute allowedRole="employee">
                <EmployeeDashboard />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/employee/tasks"
          element={
            <PrivateRoute>
              <RoleRoute allowedRole="employee">
                <MyTasks />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        <Route
          path="/employee/projects"
          element={
            <PrivateRoute>
              <RoleRoute allowedRole="employee">
                <EmployeeProjects />
              </RoleRoute>
            </PrivateRoute>
          }
        />

        {/* ================= DEFAULT REDIRECT ================= */}

        <Route path="/home" element={<Navigate to="/" />} />

        {/* ================= 404 CATCH ALL ================= */}

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
