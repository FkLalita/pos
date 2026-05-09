// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const validate = require("../middleware/validate");

const registerSchema = {
  name: { required: true, type: "string", maxLength: 80 },
  email: { required: true, type: "string" },
  password: { required: true, type: "string", min: 6 },
};

const loginSchema = {
  email: { required: true, type: "string" },
  password: { required: true, type: "string" },
};

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

module.exports = router;
