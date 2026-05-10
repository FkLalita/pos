const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  getAll, getOne, create, update, remove,
  restock, restockByName, getLowStock
} = require("../controllers/productController");

const productSchema = {
  name: { required: true, type: "string", maxLength: 100 },
  price: { required: true, type: "number", min: 0 },
};

// ── Static routes FIRST ──────────────────────
router.get("/", protect, getAll);
router.get("/low-stock", protect, getLowStock);
router.post("/", protect, adminOnly, validate(productSchema), create);
router.patch("/restock-by-name", protect, adminOnly, restockByName);

// ── Parameterized routes LAST ────────────────
router.get("/:id", protect, getOne);
router.put("/:id", protect, adminOnly, update);
router.patch("/:id/restock", protect, adminOnly, restock);
router.delete("/:id", protect, adminOnly, remove);

module.exports = router;
