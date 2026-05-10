const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/database");

const register = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });

  const hashed = bcrypt.hashSync(password, 10);
  try {
    await db.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
      [name, email, hashed, role || "cashier"]
    );
    res.status(201).json({ message: "User created" });
  } catch (e) {
    res.status(400).json({ error: "Email already exists" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = rows[0];

  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
};

module.exports = { register, login };
