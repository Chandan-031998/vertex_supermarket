import axios from "axios";

const API_BASE_URL =
  String(import.meta.env.VITE_API_URL || "").trim() || "https://vertex-supermarket.onrender.com/api";
const TOKEN_KEY = "vertex_token";
const SESSION_TOKEN_KEY = "vertex_token_session";

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY);
}

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const unwrap = (response) => response.data?.data ?? response.data;

const api = {
  customers: {
    list: async (params = {}) => unwrap(await client.get("/customers", { params })),
    create: async (payload) => unwrap(await client.post("/customers", payload)),
    update: async (id, payload) => unwrap(await client.put(`/customers/${id}`, payload)),
    remove: async (id) => unwrap(await client.delete(`/customers/${id}`)),
  },
  suppliers: {
    list: async (params = {}) => unwrap(await client.get("/suppliers", { params })),
    create: async (payload) => unwrap(await client.post("/suppliers", payload)),
    update: async (id, payload) => unwrap(await client.put(`/suppliers/${id}`, payload)),
    remove: async (id) => unwrap(await client.delete(`/suppliers/${id}`)),
  },
  pos: {
    products: async (params = {}) => unwrap(await client.get("/pos/products", { params })),
  },
  products: {
    getByBarcode: async (barcode) => unwrap(await client.get(`/products/barcode/${encodeURIComponent(barcode)}`)),
  },
  sales: {
    list: async (params = {}) => unwrap(await client.get("/sales", { params })),
    getById: async (id) => unwrap(await client.get(`/sales/${id}`)),
    create: async (payload) => unwrap(await client.post("/sales", payload)),
    invoice: async (id) => unwrap(await client.get(`/sales/${id}/invoice`)),
  },
  heldBills: {
    list: async () => unwrap(await client.get("/held-bills")),
    create: async (payload) => unwrap(await client.post("/held-bills", payload)),
    resume: async (id) => unwrap(await client.post(`/held-bills/${id}/resume`)),
  },
  reports: {
    salesSummary: async (params = {}) => unwrap(await client.get("/reports/sales-summary", { params })),
    salesList: async (params = {}) => unwrap(await client.get("/reports/sales-list", { params })),
  },
  dashboard: {
    summary: async () => unwrap(await client.get("/dashboard/summary")),
  },
};

export default api;
export { client as apiClient, API_BASE_URL, TOKEN_KEY, SESSION_TOKEN_KEY, getStoredToken };
