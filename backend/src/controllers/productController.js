// src/controllers/productController.js
const db = require("../db/database");

const getAll = (req, res) => {
  const products = db.prepare("SELECT * FROM products").all();
  res.json(products);
};

const getOne = (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
};

const create = (req, res) => {
  const { name, price, stock, category } = req.body;
  if (!name || price == null) return res.status(400).json({ error: "Name and price required" });
  const stmt = db.prepare("INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)");
  const result = stmt.run(name, price, stock || 0, category || null);
  res.status(201).json({ id: result.lastInsertRowid, name, price, stock, category });
};

const update = (req, res) => {
  const { name, price, stock, category } = req.body;
  const stmt = db.prepare(
    "UPDATE products SET name = ?, price = ?, stock = ?, category = ? WHERE id = ?"
  );
  stmt.run(name, price, stock, category, req.params.id);
  res.json({ message: "Product updated" });
};

const remove = (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ message: "Product deleted" });
};

module.exports = { getAll, getOne, create, update, remove };


