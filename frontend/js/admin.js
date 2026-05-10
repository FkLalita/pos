import {
  getToken, getUser, clearAuth,
  getProducts, createProduct, updateProduct, deleteProduct, restockProduct,
  getLowStock, getDailySummary, request
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
const restockSelect = document.getElementById("restockProduct");
const restockQty = document.getElementById("restockQty");
const restockBtn = document.getElementById("restockByNameBtn");

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
    const today = summary[0];
    document.getElementById("revenue").textContent =
      today ? `₦${Number(today.revenue).toLocaleString()}` : "₦0";
    document.getElementById("salesCount").textContent = today?.total_sales ?? 0;
    document.getElementById("lowStockCount").textContent = lowStock.count;
  } catch (e) {
    console.error("Summary load failed:", e);
  }
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
          <button class="btn btn-sm btn-danger"  onclick="window._del(${p.id}, '${p.name.replace(/'/g, "\\'")}')">Del</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="5" style="color:var(--muted)">No products.</td></tr>`;
  } catch (e) {
    console.error("Product load failed:", e);
    showAlert(alertEl, e.message);
  }
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
    loadRestockDropdown();
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
    loadRestockDropdown();
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

// ── Search ────────────────────────────────────
let timer;
searchInput.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => loadProducts(searchInput.value), 300);
});

// ── Restock Dropdown ──────────────────────────
async function loadRestockDropdown() {
  try {
    const products = await getProducts();
    if (!restockSelect) return;

    restockSelect.innerHTML = '<option value="">Select a product...</option>';

    products.forEach(product => {
      const option = document.createElement("option");
      option.value = product.name;
      option.textContent = `${product.name} (Stock: ${product.stock})`;
      restockSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load products for restock:", error);
  }
}

// ── Restock Handler ───────────────────────────
restockBtn.addEventListener("click", async () => {
  const productName = restockSelect.value;
  const quantity = parseInt(restockQty.value);

  if (!productName) {
    showAlert(formAlertEl, "Please select a product");
    return;
  }
  if (!quantity || quantity <= 0) {
    showAlert(formAlertEl, "Quantity must be a positive number");
    return;
  }

  restockBtn.disabled = true;
  try {
    const result = await request("/products/restock-by-name", {
      method: "PATCH",
      body: JSON.stringify({ name: productName, quantity })
    });

    showAlert(formAlertEl, `Restocked! ${result.product.name} now has ${result.product.stock} in stock.`, "success");
    restockQty.value = "";
    loadRestockDropdown();
    loadProducts();
    loadSummary();
  } catch (error) {
    showAlert(formAlertEl, error.message);
  } finally {
    restockBtn.disabled = false;
  }
});

// ── Init ──────────────────────────────────────
loadProducts();
loadSummary();
loadRestockDropdown();
