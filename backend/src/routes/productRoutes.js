// src/routes/productRoutes.js
const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { getAll, getOne, create, update, remove } = require("../controllers/productController");

router.get("/", protect, getAll);
router.get("/:id", protect, getOne);
router.post("/", protect, adminOnly, create);
router.put("/:id", protect, adminOnly, update);
router.delete("/:id", protect, adminOnly, remove);

module.exports = router;
