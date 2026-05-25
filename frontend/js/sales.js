import { getToken, getUser, clearAuth, getSales, getDailySummary } from "./api.js";

// Auth guard — admin only
if (!getToken()) location.href = "index.html";
if (getUser()?.role !== "admin") location.href = "dashboard.html";

document.getElementById("logoutBtn").onclick = () => { clearAuth(); location.href = "index.html"; };

const BASE = "https://pos-backend-zb2r.onrender.com/api";
const salesBody = document.getElementById("salesBody");
const alertEl = document.getElementById("alert");
const detailModal = document.getElementById("detailModal");
const closeDetailBtn = document.getElementById("closeDetail");

closeDetailBtn.onclick = () => detailModal.classList.remove("show");

let allSales = [];

// ── Load summary strip ─────────────────────────
const loadSummary = async () => {
  try {
    const summary = await getDailySummary();
    const today = new Date().toISOString().slice(0, 10);
    const todayRow = summary.find(r => r.date === today);

    const totalSales = summary.reduce((s, r) => s + Number(r.total_sales), 0);
    const totalRevenue = summary.reduce((s, r) => s + Number(r.revenue), 0);

    document.getElementById("totalSales").textContent = totalSales;
    document.getElementById("totalRevenue").textContent = `₦${totalRevenue.toLocaleString()}`;
    document.getElementById("todayRevenue").textContent =
      todayRow ? `₦${Number(todayRow.revenue).toLocaleString()}` : "₦0";
  } catch { }
};

// ── Load sales table ───────────────────────────
const loadSales = async () => {
  try {
    allSales = await getSales();

    if (!allSales.length) {
      salesBody.innerHTML = `<tr><td colspan="6" style="color:var(--muted)">No sales yet.</td></tr>`;
      return;
    }

    salesBody.innerHTML = allSales.map(s => `
      <tr>
        <td>#${s.id}</td>
        <td>${new Date(s.created_at).toLocaleString("en-NG")}</td>
        <td>${s.cashier || "—"}</td>
        <td style="color:var(--muted);font-size:.8rem">tap to view</td>
        <td><strong>₦${Number(s.total).toLocaleString()}</strong></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="window._viewSale(${s.id})">
            View
          </button>
        </td>
      </tr>
    `).join("");
  } catch (e) {
    alertEl.textContent = e.message;
    alertEl.className = "alert alert-error show";
  }
};

// ── View sale detail ───────────────────────────
window._viewSale = async (id) => {
  try {
    const res = await fetch(`${BASE}/sales/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const sale = await res.json();

    document.getElementById("detailMeta").textContent =
      `Sale #${sale.id} • ${new Date(sale.created_at).toLocaleString("en-NG")} • Cashier: ${sale.cashier_id || "—"}`;

    document.getElementById("detailItems").innerHTML = sale.items.map(i => `
      <tr>
        <td>${i.product_name}</td>
        <td style="text-align:center">${i.quantity}x</td>
        <td style="text-align:right">₦${(i.price_at_sale * i.quantity).toLocaleString()}</td>
      </tr>
    `).join("");

    document.getElementById("detailTotal").textContent =
      `Total: ₦${Number(sale.total).toLocaleString()}`;

    detailModal.classList.add("show");
  } catch (e) {
    alert("Could not load sale details");
  }
};

// ── Export CSV ────────────────────────────────
document.getElementById("exportBtn").addEventListener("click", () => {
  if (!allSales.length) return;

  const rows = [
    ["Sale ID", "Date", "Cashier", "Total (₦)"],
    ...allSales.map(s => [
      `#${s.id}`,
      new Date(s.created_at).toLocaleString("en-NG"),
      s.cashier || "—",
      Number(s.total).toFixed(2),
    ])
  ];

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Init ──────────────────────────────────────
loadSummary();
loadSales();
