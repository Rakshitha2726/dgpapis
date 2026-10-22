/**
 * response.js
 * -----------
 * Utility helpers for sending consistent JSON responses.
 *
 * Every API response follows the same envelope structure:
 *   { success: boolean, message: string, data?: any, meta?: any }
 *
 * Usage:
 *   import { sendSuccess, sendError } from '../utils/response.js';
 *   sendSuccess(res, { user }, 'User fetched', 200);
 *   sendError(res, 'Not found', 404);
 */

/**
 * Sends a successful JSON response.
 *
 * @param {import('express').Response} res
 * @param {any}    data     - The payload to return
 * @param {string} message  - Human-readable success message
 * @param {number} status   - HTTP status code (default 200)
 * @param {object} meta     - Optional pagination / extra metadata
 */
export const sendSuccess = (res, data = null, message = 'Success', status = 200, meta = null) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(status).json(body);
};

/**
 * Sends an error JSON response.
 *
 * @param {import('express').Response} res
 * @param {string} message  - Human-readable error message
 * @param {number} status   - HTTP status code (default 500)
 * @param {any}    errors   - Optional validation errors array
 */
export const sendError = (res, message = 'An error occurred', status = 500, errors = null) => {
  const body = { success: false, message };
  if (errors !== null) body.errors = errors;
  return res.status(status).json(body);
};
