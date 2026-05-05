// src/controllers/saleController.js
const db = require("../db/database");

// Process a new sale
// Body: { items: [{ product_id, quantity }] }
const createSale = (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0)
    return res.status(400).json({ error: "No items in sale" });

  // Use a transaction so everything saves or nothing does
  const processSale = db.transaction(() => {
    let total = 0;
    const enriched = [];

    for (const item of items) {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      if (product.stock < item.quantity) throw new Error(`Not enough stock for ${product.name}`);

      total += product.price * item.quantity;
      enriched.push({ product, quantity: item.quantity });
    }

    // Insert sale
    const saleResult = db.prepare(
      "INSERT INTO sales (total, cashier_id) VALUES (?, ?)"
    ).run(total, req.user.id);

    const saleId = saleResult.lastInsertRowid;

    // Insert sale items and reduce stock
    for (const { product, quantity } of enriched) {
      db.prepare(
        "INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)"
      ).run(saleId, product.id, quantity, product.price);

      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?")
        .run(quantity, product.id);
    }

    return { saleId, total };
  });

  try {
    const result = processSale();
    res.status(201).json({ message: "Sale recorded", ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// Get all sales (with cashier name)
const getSales = (req, res) => {
  const sales = db.prepare(`
    SELECT s.id, s.total, s.created_at, u.name AS cashier
    FROM sales s
    LEFT JOIN users u ON s.cashier_id = u.id
    ORDER BY s.created_at DESC
  `).all();
  res.json(sales);
};

// Get one sale with its items
const getSaleById = (req, res) => {
  const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(req.params.id);
  if (!sale) return res.status(404).json({ error: "Sale not found" });

  const items = db.prepare(`
    SELECT si.quantity, si.price_at_sale, p.name AS product_name
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `).all(req.params.id);

  res.json({ ...sale, items });
};

// Daily summary
const getDailySummary = (req, res) => {
  const summary = db.prepare(`
    SELECT DATE(created_at) AS date, COUNT(*) AS total_sales, SUM(total) AS revenue
    FROM sales
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `).all();
  res.json(summary);
};

module.exports = { createSale, getSales, getSaleById, getDailySummary };


// ─────────────────────────────────────────────

