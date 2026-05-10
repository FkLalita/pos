
const db = require("../db/database");

const createSale = async (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0)
    return res.status(400).json({ error: "No items in sale" });

  const client = await db.connect(); // use a single connection for the transaction
  try {
    await client.query("BEGIN");

    let total = 0;
    const enriched = [];

    for (const item of items) {
      const { rows } = await client.query("SELECT * FROM products WHERE id = $1", [item.product_id]);
      const product = rows[0];
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      if (product.stock < item.quantity) throw new Error(`Not enough stock for ${product.name}`);
      total += product.price * item.quantity;
      enriched.push({ product, quantity: item.quantity });
    }

    const { rows: saleRows } = await client.query(
      "INSERT INTO sales (total, cashier_id) VALUES ($1, $2) RETURNING id",
      [total, req.user.id]
    );
    const saleId = saleRows[0].id;

    for (const { product, quantity } of enriched) {
      await client.query(
        "INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale) VALUES ($1, $2, $3, $4)",
        [saleId, product.id, quantity, product.price]
      );
      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [quantity, product.id]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Sale recorded", saleId, total });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
};

const getSales = async (req, res) => {
  const { rows } = await db.query(`
    SELECT s.id, s.total, s.created_at, u.name AS cashier
    FROM sales s LEFT JOIN users u ON s.cashier_id = u.id
    ORDER BY s.created_at DESC
  `);
  res.json(rows);
};

const getSaleById = async (req, res) => {
  const { rows: sale } = await db.query("SELECT * FROM sales WHERE id = $1", [req.params.id]);
  if (!sale[0]) return res.status(404).json({ error: "Sale not found" });

  const { rows: items } = await db.query(`
    SELECT si.quantity, si.price_at_sale, p.name AS product_name
    FROM sale_items si JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = $1
  `, [req.params.id]);

  res.json({ ...sale[0], items });
};

const getDailySummary = async (req, res) => {
  const { rows } = await db.query(`
    SELECT DATE(created_at) AS date, COUNT(*) AS total_sales, SUM(total) AS revenue
    FROM sales
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `);
  res.json(rows);
};

module.exports = { createSale, getSales, getSaleById, getDailySummary };

