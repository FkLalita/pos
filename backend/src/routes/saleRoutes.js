// src/routes / saleRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { createSale, getSales, getSaleById, getDailySummary } = require("../controllers/saleController");

router.post("/", protect, createSale);
router.get("/", protect, getSales);
router.get("/summary", protect, getDailySummary);
router.get("/:id", protect, getSaleById);

module.exports = router;
