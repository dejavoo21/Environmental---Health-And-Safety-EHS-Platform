class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode || 500;
    this.code = code || 'SERVER_ERROR';
  }
}

module.exports = { AppError };
