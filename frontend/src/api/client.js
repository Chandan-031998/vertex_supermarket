import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://vertex-supermarket.onrender.com/api",
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

export default api;
