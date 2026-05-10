const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const saleRoutes = require("./routes/saleRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "POS API is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);

// Must be last — catches all errors
app.use(errorHandler);

module.exports = app;
