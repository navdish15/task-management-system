import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: false,
});

/* ================= REQUEST INTERCEPTOR ================= */

api.interceptors.request.use(
  (config) => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (storedUser?.token) {
      config.headers.Authorization = `Bearer ${storedUser.token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/* ================= RESPONSE INTERCEPTOR ================= */

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(error);
    }

    const status = error.response.status;

    // Only logout if token is actually invalid
    if (status === 401) {
      const storedUser = JSON.parse(localStorage.getItem("user"));

      // If no user stored → do nothing
      if (!storedUser?.token) {
        return Promise.reject(error);
      }

      console.warn("Unauthorized request. Logging out...");

      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
