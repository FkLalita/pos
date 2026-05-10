import { login, saveAuth, getUser, getToken } from "./api.js";

// Redirect if already logged in
if (getToken()) {
  const user = getUser();
  location.href = user?.role === "admin" ? "admin.html" : "dashboard.html";
}

const alertEl = document.getElementById("alert");
const btn = document.getElementById("loginBtn");
const overlay = document.getElementById("wakeOverlay");

const showAlert = (msg, type = "error") => {
  alertEl.textContent = msg;
  alertEl.className = `alert alert-${type} show`;
};

// Ping server on page load so Render wakes up before user clicks login
const pingServer = async () => {
  try {
    const res = await fetch(
      "https://pos-backend-zb2r.onrender.com/",
      { signal: AbortSignal.timeout(35000) }
    );
    if (!res.ok) throw new Error();
  } catch {
    showAlert("Server is slow to start, please try again in a moment.");
  } finally {
    overlay.classList.remove("show");
  }
};

overlay.classList.add("show");
pingServer();

btn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) return showAlert("Fill in all fields");

  btn.textContent = "Logging in";
  btn.classList.add("loading");
  btn.disabled = true;

  try {
    const data = await login(email, password);
    saveAuth(data.token, data.user);
    location.href = data.user.role === "admin" ? "admin.html" : "dashboard.html";
  } catch (e) {
    showAlert(e.message);
    btn.textContent = "Login";
    btn.classList.remove("loading");
    btn.disabled = false;
  }
});
