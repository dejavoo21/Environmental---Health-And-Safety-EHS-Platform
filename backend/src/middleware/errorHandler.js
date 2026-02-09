const { AppError } = require('../utils/appError');

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }

  console.error(err);
  return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
};

module.exports = { errorHandler };
