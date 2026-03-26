import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const storedUser = JSON.parse(localStorage.getItem("user"));

  if (!storedUser) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(storedUser.role)) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
