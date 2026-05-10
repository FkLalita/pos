import { login, saveAuth, getUser, getToken } from "./api.js";

// Redirect if already logged in
if (getToken()) {
  const user = getUser();
  location.href = user?.role === "admin" ? "admin.html" : "dashboard.html";
}

const alert = document.getElementById("alert");
const btn = document.getElementById("loginBtn");

const showAlert = (msg, type = "error") => {
  alert.textContent = msg;
  alert.className = `alert alert-${type} show`;
};

btn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  console.log("Login clicked", email); // debug

  if (!email || !password) return showAlert("Fill in all fields");

  btn.textContent = "Logging in...";
  btn.disabled = true;

  try {
    const data = await login(email, password);
    saveAuth(data.token, data.user);
    location.href = data.user.role === "admin" ? "admin.html" : "dashboard.html";
  } catch (e) {
    console.error("Login error:", e); // debug
    showAlert(e.message);
    btn.textContent = "Login";
    btn.disabled = false;
  }
});
