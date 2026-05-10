const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase
});

// Create tables if they don't exist
const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'cashier'
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      total NUMERIC NOT NULL,
      cashier_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id SERIAL PRIMARY KEY,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      price_at_sale NUMERIC NOT NULL
    );
  `);
  console.log("Database ready");
};

init().catch(console.error);

module.exports = pool;
