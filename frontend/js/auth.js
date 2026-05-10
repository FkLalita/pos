const BASE = "https://pos-backend-zb2r.onrender.com/api";

// Redirect if already logged in
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");
if (token) {
  location.href = user?.role === "admin" ? "admin.html" : "dashboard.html";
}

const alertEl = document.getElementById("alert");
const btn = document.getElementById("loginBtn");

const showAlert = (msg, type = "error") => {
  alertEl.textContent = msg;
  alertEl.className = `alert alert-${type} show`;
};

btn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) return showAlert("Fill in all fields");

  btn.textContent = "Logging in...";
  btn.disabled = true;

  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    location.href = data.user.role === "admin" ? "admin.html" : "dashboard.html";
  } catch (e) {
    showAlert(e.message);
    btn.textContent = "Login";
    btn.disabled = false;
  }
});
