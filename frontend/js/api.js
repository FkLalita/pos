const BASE = "https://pos-backend-zb2r.onrender.com/api";

// ── Token helpers ──────────────────────────────
const getToken = () => localStorage.getItem("token");
const getUser = () => JSON.parse(localStorage.getItem("user") || "null");
const saveAuth = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};
const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

// ── Base fetch wrapper ─────────────────────────
const request = async (path, options = {}) => {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("Cannot reach server. Is your backend running?");
  }

  const text = await res.text();
  if (!text) throw new Error("Empty response from server");

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", text);
    throw new Error(`Server error (${res.status}): unexpected response`);
  }

  if (!res.ok) throw new Error(data.error || data.errors?.[0] || "Request failed");
  return data;
};

// ── Auth ───────────────────────────────────────
const login = (email, password) =>
  request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

// ── Products ───────────────────────────────────
const getProducts = (search = "", category = "") => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  return request(`/products?${params}`);
};

const createProduct = (data) =>
  request("/products", { method: "POST", body: JSON.stringify(data) });

const updateProduct = (id, data) =>
  request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) });

const deleteProduct = (id) =>
  request(`/products/${id}`, { method: "DELETE" });

const restockProduct = (id, quantity) =>
  request(`/products/${id}/restock`, { method: "PATCH", body: JSON.stringify({ quantity }) });

const getLowStock = (threshold = 10) =>
  request(`/products/low-stock?threshold=${threshold}`);

// ── Sales ──────────────────────────────────────
const createSale = (items) =>
  request("/sales", { method: "POST", body: JSON.stringify({ items }) });

const getSales = () => request("/sales");

const getDailySummary = () => request("/sales/summary");

export {
  getToken, getUser, saveAuth, clearAuth,
  login,
  getProducts, createProduct, updateProduct, deleteProduct, restockProduct, getLowStock,
  createSale, getSales, getDailySummary,
};
