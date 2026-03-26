import axios from "axios";

const envApiUrl = String(import.meta.env.VITE_API_URL || "").trim();
const runtimeDefaultApi =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5000/api"
    : `${window.location.origin}/api`;
const API_URL = envApiUrl || runtimeDefaultApi;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vertex_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem("vertex_token");
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
export { API_URL };
