function errorHandler(err, req, res, next) {
  // Default to 500
  const status = err.status || 500;
  const payload = {
    message: err.publicMessage || 'Server error'
  };
  if (process.env.NODE_ENV === 'development') {
    payload.error = err.message;
  }
  res.status(status).json(payload);
}

module.exports = { errorHandler };


