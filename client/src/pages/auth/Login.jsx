import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import socket from "../../services/socket";
import "../../assets/login.css";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/login", {
        username,
        password,
      });

      if (res.data.message === "success") {
        const userData = {
          token: res.data.token,
          role: res.data.role,
          username: res.data.username,
        };

        localStorage.setItem("user", JSON.stringify(userData));

        // ✅ SEND TOKEN + CONNECT SOCKET
        socket.auth = {
          token: res.data.token,
        };

        socket.connect();

        // Redirect based on role
        if (res.data.role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/employee-dashboard");
        }
      } else {
        setError(res.data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error(err);

      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Server error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        backgroundImage: "url('/log.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="login-container">
        <h2 className="login-header">Login to TaskManager</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleLogin} autoComplete="off">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      <div className="footer">© 2025 TaskManager. All rights reserved.</div>
    </div>
  );
}

export default Login;
