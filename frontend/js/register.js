import { getToken, getUser } from "./api.js";

const BASE = "https://pos-backend-zb2r.onrender.com/api";

if (getToken()) {
  const user = getUser();
  location.href = user?.role === "admin" ? "admin.html" : "dashboard.html";
}

const alertEl = document.getElementById("alert");
const btn = document.getElementById("registerBtn");

const showAlert = (msg, type = "error") => {
  alertEl.textContent = msg;
  alertEl.className = `alert alert-${type} show`;
};

btn.addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!name || !email || !password) return showAlert("All fields are required");
  if (password.length < 6) return showAlert("Password must be at least 6 characters");

  btn.textContent = "Creating account";
  btn.classList.add("loading");
  btn.disabled = true;

  try {
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "cashier" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    showAlert("Account created! Redirecting to login…", "success");
    setTimeout(() => location.href = "index.html", 1500);
  } catch (e) {
    showAlert(e.message);
    btn.textContent = "Create Account";
    btn.classList.remove("loading");
    btn.disabled = false;
  }
});
