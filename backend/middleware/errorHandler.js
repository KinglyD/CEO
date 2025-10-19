// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific types of errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Handle JWT specific errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Handle unique constraint violations
  if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 400;
    message = 'Duplicate field value entered';
  }

  // Handle foreign key violations
  if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced record does not exist';
  }

  // Development vs Production error response
  const error = {
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        detail: err.detail
      })
    }
  };

  res.status(statusCode).json(error);
};

export default errorHandler;