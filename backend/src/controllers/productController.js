
const db = require("../db/database");

const getAll = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    let query = "SELECT * FROM products WHERE 1=1";
    const params = [];

    if (search) { params.push(`%${search}%`); query += ` AND name ILIKE ${params.length}`; }
    if (category) { params.push(category); query += ` AND category = ${params.length}`; }

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (e) { next(e); }
};

const getOne = async (req, res, next) => {
  try {
    const { rows } = await db.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Product not found" });
    res.json(rows[0]);
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { name, price, stock, category } = req.body;
    const { rows } = await db.query(
      "INSERT INTO products (name, price, stock, category) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, Number(price), Number(stock) || 0, category || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const { rows: existing } = await db.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: "Product not found" });

    const p = existing[0];
    const { name, price, stock, category } = req.body;
    await db.query(
      "UPDATE products SET name=$1, price=$2, stock=$3, category=$4 WHERE id=$5",
      [name ?? p.name, price ?? p.price, stock ?? p.stock, category ?? p.category, req.params.id]
    );
    res.json({ message: "Product updated" });
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    const { rows } = await db.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Product not found" });
    await db.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.json({ message: "Product deleted" });
  } catch (e) { next(e); }
};

const restock = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0)
      return res.status(400).json({ error: "Quantity must be a positive number" });

    const { rows } = await db.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Product not found" });

    const { rows: updated } = await db.query(
      "UPDATE products SET stock = stock + $1 WHERE id = $2 RETURNING *",
      [Number(quantity), req.params.id]
    );
    res.json({ message: "Stock updated", product: updated[0] });
  } catch (e) { next(e); }
};

const getLowStock = async (req, res, next) => {
  try {
    const threshold = Number(req.query.threshold) || 10;
    const { rows } = await db.query(
      "SELECT * FROM products WHERE stock <= $1 ORDER BY stock ASC",
      [threshold]
    );
    res.json({ threshold, count: rows.length, products: rows });
  } catch (e) { next(e); }
};

module.exports = { getAll, getOne, create, update, remove, restock, getLowStock };
