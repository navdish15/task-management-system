import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Math.floor(new Date().getTime() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
};

const PrivateRoute = ({ children }) => {
  const storedUser = JSON.parse(localStorage.getItem("user"));

  if (!storedUser?.token) {
    return <Navigate to="/login" />;
  }

  if (isTokenExpired(storedUser.token)) {
    localStorage.removeItem("user");
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;
