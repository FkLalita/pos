// Tiny validation helper — no extra packages needed

const validate = (schema) => (req, res, next) => {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const val = req.body[field];

    if (rules.required && (val === undefined || val === null || val === "")) {
      errors.push(`${field} is required`);
      continue;
    }

    if (val !== undefined) {
      if (rules.type === "number" && isNaN(Number(val)))
        errors.push(`${field} must be a number`);

      if (rules.min !== undefined && Number(val) < rules.min)
        errors.push(`${field} must be at least ${rules.min}`);

      if (rules.type === "string" && typeof val !== "string")
        errors.push(`${field} must be a string`);

      if (rules.maxLength && val.length > rules.maxLength)
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
    }
  }

  if (errors.length > 0)
    return res.status(400).json({ errors });

  next();
};

module.exports = validate;
