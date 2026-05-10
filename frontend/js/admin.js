import {
  getToken, getUser, clearAuth,
  getProducts, createProduct, updateProduct, deleteProduct, restockProduct,
  getLowStock, getDailySummary
} from "./api.js";

// Auth guard — admin only
if (!getToken()) location.href = "index.html";
if (getUser()?.role !== "admin") location.href = "dashboard.html";

document.getElementById("logoutBtn").onclick = () => { clearAuth(); location.href = "index.html"; };

// ── DOM refs ──────────────────────────────────
const tbody = document.querySelector("#productTable tbody");
const searchInput = document.getElementById("searchInput");
const alertEl = document.getElementById("alert");
const formAlertEl = document.getElementById("formAlert");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formTitle = document.getElementById("formTitle");

let editingId = null;

// ── Alerts ────────────────────────────────────
const showAlert = (el, msg, type = "error") => {
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
  setTimeout(() => el.className = "alert", 3000);
};

// ── Summary cards ─────────────────────────────
const loadSummary = async () => {
  try {
    const [summary, lowStock] = await Promise.all([getDailySummary(), getLowStock()]);
    const today = summary[0]; // most recent day
    document.getElementById("revenue").textContent =
      today ? `₦${Number(today.revenue).toLocaleString()}` : "₦0";
    document.getElementById("salesCount").textContent = today?.total_sales ?? 0;
    document.getElementById("lowStockCount").textContent = lowStock.count;
  } catch { }
};

// ── Product table ─────────────────────────────
const loadProducts = async (search = "") => {
  try {
    const products = await getProducts(search);
    tbody.innerHTML = products.length ? products.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>₦${Number(p.price).toLocaleString()}</td>
        <td>
          ${p.stock <= 10
        ? `<span class="badge badge-warning">⚠️ ${p.stock}</span>`
        : `<span class="badge badge-success">${p.stock}</span>`}
        </td>
        <td>${p.category || "—"}</td>
        <td style="display:flex;gap:.4rem">
          <button class="btn btn-sm btn-primary" onclick="window._edit(${p.id})">Edit</button>
          <button class="btn btn-sm btn-danger"  onclick="window._del(${p.id}, '${p.name}')">Del</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="5" style="color:var(--muted)">No products.</td></tr>`;
  } catch (e) { showAlert(alertEl, e.message); }
};

// ── Save (add / update) ───────────────────────
saveBtn.addEventListener("click", async () => {
  const name = document.getElementById("fName").value.trim();
  const price = document.getElementById("fPrice").value;
  const stock = document.getElementById("fStock").value;
  const category = document.getElementById("fCategory").value.trim();

  if (!name || !price) return showAlert(formAlertEl, "Name and price are required");

  saveBtn.disabled = true;
  try {
    if (editingId) {
      await updateProduct(editingId, { name, price: Number(price), stock: Number(stock), category });
      showAlert(formAlertEl, "Product updated!", "success");
    } else {
      await createProduct({ name, price: Number(price), stock: Number(stock), category });
      showAlert(formAlertEl, "Product added!", "success");
    }
    resetForm();
    loadProducts();
    loadSummary();
  } catch (e) {
    showAlert(formAlertEl, e.message);
  } finally {
    saveBtn.disabled = false;
  }
});

// ── Edit mode ─────────────────────────────────
window._edit = async (id) => {
  try {
    const products = await getProducts();
    const p = products.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    document.getElementById("fName").value = p.name;
    document.getElementById("fPrice").value = p.price;
    document.getElementById("fStock").value = p.stock;
    document.getElementById("fCategory").value = p.category || "";
    formTitle.textContent = "Edit Product";
    saveBtn.textContent = "Update Product";
    cancelBtn.style.display = "inline-flex";
  } catch (e) { showAlert(alertEl, e.message); }
};

// ── Delete ────────────────────────────────────
window._del = async (id, name) => {
  if (!confirm(`Delete "${name}"?`)) return;
  try {
    await deleteProduct(id);
    showAlert(alertEl, `"${name}" deleted.`, "success");
    loadProducts();
    loadSummary();
  } catch (e) { showAlert(alertEl, e.message); }
};

// ── Reset form ────────────────────────────────
const resetForm = () => {
  editingId = null;
  ["fName", "fPrice", "fStock", "fCategory"].forEach(id => document.getElementById(id).value = "");
  formTitle.textContent = "Add Product";
  saveBtn.textContent = "Add Product";
  cancelBtn.style.display = "none";
};

// ── Cancel edit ───────────────────────────────
cancelBtn.addEventListener("click", resetForm);

// ── Restock ───────────────────────────────────
const restockSelect = document.getElementById("restockProduct");
const restockQty = document.getElementById("restockQty");
const restockMsg = document.getElementById("restockMsg");

// Populate restock dropdown
const loadRestockDropdown = async () => {
  try {
    const products = await getProducts();
    restockSelect.innerHTML = '<option value="">Select a product...</option>';
    products.forEach(p => {
      const option = document.createElement("option");
      option.value = p.name;
      option.textContent = `${p.name} (Stock: ${p.stock})`;
      restockSelect.appendChild(option);
    });
  } catch (e) {
    console.error("Failed to load restock dropdown:", e);
  }
};

// Restock button handler
document.getElementById("restockBtn").addEventListener("click", async () => {
  const name = restockSelect.value;
  const qty = parseInt(restockQty.value);

  if (!name) return showAlert(restockMsg, "Please select a product");
  if (!qty || qty <= 0) return showAlert(restockMsg, "Quantity must be a positive number");

  restockBtn.disabled = true;
  try {
    // Use the existing restockProduct from api.js — but we need restock by name
    // Since api.js exports restockProduct(id, qty), we call our new endpoint directly
    const token = getToken();
    const res = await fetch("https://pos-backend-zb2r.onrender.com/api/products/restock-by-name", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ name, quantity: qty })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Restock failed");
    }

    const data = await res.json();
    showAlert(restockMsg, `✅ ${data.product.name} restocked! New stock: ${data.product.stock}`, "success");
    restockQty.value = "";
    restockSelect.value = "";
    loadRestockDropdown();
    loadProducts();
    loadSummary();
  } catch (e) {
    showAlert(restockMsg, e.message);
  } finally {
    restockBtn.disabled = false;
  }
});

// ── Init ──────────────────────────────────────
loadProducts();
loadSummary();
loadRestockDropdown();
