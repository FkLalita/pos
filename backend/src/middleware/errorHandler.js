// Catches any error passed via next(err) in controllers

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url} —`, err.message);

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
  });
};

module.exports = errorHandler;
