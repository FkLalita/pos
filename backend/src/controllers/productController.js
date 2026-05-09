
const db = require("../db/database");

const getAll = (req, res, next) => {
  try {
    const { category, search } = req.query;
    let query = "SELECT * FROM products WHERE 1=1";
    const params = [];

    if (category) { query += " AND category = ?"; params.push(category); }
    if (search) { query += " AND name LIKE ?"; params.push(`%${search}%`); }

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (e) { next(e); }
};

const getOne = (req, res, next) => {
  try {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (e) { next(e); }
};

const create = (req, res, next) => {
  try {
    const { name, price, stock, category } = req.body;
    const stmt = db.prepare(
      "INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(name, Number(price), Number(stock) || 0, category || null);
    res.status(201).json({ id: result.lastInsertRowid, name, price, stock, category });
  } catch (e) { next(e); }
};

const update = (req, res, next) => {
  try {
    const { name, price, stock, category } = req.body;
    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found" });

    db.prepare(
      "UPDATE products SET name = ?, price = ?, stock = ?, category = ? WHERE id = ?"
    ).run(
      name ?? existing.name,
      price ?? existing.price,
      stock ?? existing.stock,
      category ?? existing.category,
      req.params.id
    );
    res.json({ message: "Product updated" });
  } catch (e) { next(e); }
};

const remove = (req, res, next) => {
  try {
    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found" });
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (e) { next(e); }
};

// Restock a product — admin only
// Body: { quantity: 50 }
const restock = (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0)
      return res.status(400).json({ error: "Quantity must be a positive number" });

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?")
      .run(Number(quantity), req.params.id);

    const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    res.json({ message: "Stock updated", product: updated });
  } catch (e) { next(e); }
};

// Get products with stock below threshold (default: 10)
const getLowStock = (req, res, next) => {
  try {
    const threshold = Number(req.query.threshold) || 10;
    const products = db.prepare(
      "SELECT * FROM products WHERE stock <= ? ORDER BY stock ASC"
    ).all(threshold);
    res.json({ threshold, count: products.length, products });
  } catch (e) { next(e); }
};

module.exports = { getAll, getOne, create, update, remove, restock, getLowStock };


