/**
 * errorHandler.js
 * ---------------
 * Central Express error-handling middleware.
 *
 * notFoundHandler  – catches requests to undefined routes (404)
 * errorHandler     – catches all errors thrown anywhere in the app
 *
 * Both must be registered LAST in app.js, after all routes.
 */

/**
 * Handles requests to routes that don't exist.
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Global error handler.
 * Express identifies this as an error handler because it has 4 parameters.
 *
 * Handles:
 *  - Operational errors (thrown manually with a statusCode)
 *  - Sequelize validation errors
 *  - Generic unexpected errors (500)
 */
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Default to 500 if no statusCode was set
  const statusCode = err.statusCode || err.status || 500;

  // Log full stack in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${statusCode}:`, err);
  } else {
    // In production, only log the message (avoid leaking internals)
    console.error(`[ERROR] ${statusCode}: ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only include the stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
