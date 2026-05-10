import { getUser, getToken, clearAuth, getProducts, createSale } from "./api.js";

// Auth guard
if (!getToken()) location.href = "index.html";
const user = getUser();
document.getElementById("cashierName").textContent = `👤 ${user?.name}`;
document.getElementById("logoutBtn").onclick = () => { clearAuth(); location.href = "index.html"; };
if (user?.role === "admin") document.getElementById("adminLink").style.display = "inline";

// ── State ─────────────────────────────────────
let cart = [];   // [{ product, quantity }]

// ── DOM refs ──────────────────────────────────
const grid = document.getElementById("productGrid");
const cartDiv = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const alertEl = document.getElementById("alert");
const searchInput = document.getElementById("searchInput");

// ── Alert ─────────────────────────────────────
const showAlert = (msg, type = "error") => {
  alertEl.textContent = msg;
  alertEl.className = `alert alert-${type} show`;
  setTimeout(() => alertEl.className = "alert", 3000);
};

// ── Load products ─────────────────────────────
const loadProducts = async (search = "") => {
  grid.innerHTML = "<p style='color:var(--muted)'>Loading…</p>";
  try {
    const products = await getProducts(search);
    if (!products.length) { grid.innerHTML = "<p style='color:var(--muted)'>No products found.</p>"; return; }
    grid.innerHTML = products.map(p => `
      <div class="product-tile ${p.stock <= 10 ? "low-stock" : ""}"
           data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-stock="${p.stock}">
        <div class="p-name">${p.name}</div>
        <div class="p-price">₦${Number(p.price).toLocaleString()}</div>
        <div class="p-stock">${p.stock <= 10 ? "⚠️" : ""} Stock: ${p.stock}</div>
      </div>
    `).join("");

    grid.querySelectorAll(".product-tile").forEach(tile => {
      tile.addEventListener("click", () => addToCart({
        id: Number(tile.dataset.id),
        name: tile.dataset.name,
        price: Number(tile.dataset.price),
        stock: Number(tile.dataset.stock),
      }));
    });
  } catch (e) { grid.innerHTML = `<p style='color:red'>${e.message}</p>`; }
};

// ── Cart logic ────────────────────────────────
const addToCart = (product) => {
  const existing = cart.find(i => i.product.id === product.id);
  const inCart = existing ? existing.quantity : 0;

  if (inCart >= product.stock) return showAlert(`Not enough stock for ${product.name}`);

  if (existing) existing.quantity++;
  else cart.push({ product, quantity: 1 });

  renderCart();
};

const removeFromCart = (id) => {
  cart = cart.filter(i => i.product.id !== id);
  renderCart();
};

const changeQty = (id, delta) => {
  const item = cart.find(i => i.product.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) removeFromCart(id);
  else if (item.quantity > item.product.stock) {
    item.quantity -= delta;
    showAlert(`Max stock reached for ${item.product.name}`);
  } else renderCart();
};

const renderCart = () => {
  if (!cart.length) {
    cartDiv.innerHTML = "<p style='color:var(--muted);font-size:.875rem'>No items yet.</p>";
    cartTotal.style.display = "none";
    checkoutBtn.style.display = "none";
    return;
  }

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  cartDiv.innerHTML = cart.map(i => `
    <div class="cart-item">
      <span>${i.product.name}</span>
      <div style="display:flex;align-items:center;gap:.5rem">
        <button class="btn btn-sm" onclick="window._qty(${i.product.id}, -1)">−</button>
        <span>${i.quantity}</span>
        <button class="btn btn-sm" onclick="window._qty(${i.product.id}, 1)">+</button>
        <span style="min-width:70px;text-align:right">₦${(i.product.price * i.quantity).toLocaleString()}</span>
        <button class="btn btn-sm btn-danger" onclick="window._rm(${i.product.id})">✕</button>
      </div>
    </div>
  `).join("");

  cartTotal.textContent = `Total: ₦${total.toLocaleString()}`;
  cartTotal.style.display = "block";
  checkoutBtn.style.display = "block";
};

// Expose to inline onclick
window._rm = removeFromCart;
window._qty = changeQty;

// ── Receipt ───────────────────────────────────
const receiptModal = document.getElementById("receiptModal");
const closeReceiptBtn = document.getElementById("closeReceipt");

closeReceiptBtn.onclick = () => receiptModal.classList.remove("show");

const showReceipt = (saleId, total) => {
  document.getElementById("receiptDate").textContent =
    new Date().toLocaleString("en-NG");
  document.getElementById("receiptCashier").textContent = `Cashier: ${user?.name}`;
  document.getElementById("receiptItems").innerHTML = cart.map(i => `
    <tr>
      <td>${i.product.name}</td>
      <td style="text-align:center">${i.quantity}x</td>
      <td>₦${(i.product.price * i.quantity).toLocaleString()}</td>
    </tr>
  `).join("");
  document.getElementById("receiptTotal").textContent =
    `Total: ₦${Number(total).toLocaleString()}`;
  receiptModal.classList.add("show");
};

// ── Checkout ──────────────────────────────────
checkoutBtn.addEventListener("click", async () => {
  if (!cart.length) return;
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Processing…";

  try {
    const items = cart.map(i => ({ product_id: i.product.id, quantity: i.quantity }));
    const result = await createSale(items);
    showReceipt(result.saleId, result.total);
    cart = [];
    renderCart();
    loadProducts();
  } catch (e) {
    showAlert(e.message);
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "✅ Checkout";
  }
});

// ── Search ────────────────────────────────────
let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadProducts(searchInput.value), 300);
});

// ── Init ──────────────────────────────────────
loadProducts();
