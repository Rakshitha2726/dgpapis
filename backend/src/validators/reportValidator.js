// validators/reportValidator.js
// Validates parameters for report export endpoint.

import Joi from 'joi';

/**
 * Validate URL params: departmentId, year, month
 */
export const validateReportParams = (req, res, next) => {
  const schema = Joi.object({
    departmentId: Joi.number().integer().positive().required()
      .messages({ 'number.base': 'Department ID must be a positive integer.', 'any.required': 'Department ID is required.' }),
    year: Joi.number().integer().min(2000).max(2100).required()
      .messages({ 'number.base': 'Year must be a valid integer.', 'number.min': 'Year must be >= 2000.', 'number.max': 'Year must be <= 2100.' }),
    month: Joi.number().integer().min(1).max(12).required()
      .messages({ 'number.base': 'Month must be an integer 1‑12.', 'number.min': 'Month cannot be less than 1.', 'number.max': 'Month cannot be greater than 12.' }),
  });

  const { error, value } = schema.validate(req.params, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid report route parameters.',
      errors: error.details.map((d) => d.message),
    });
  }
  req.params = value;
  next();
};

/**
 * Validate query string: format (pdf|excel)
 */
export const validateReportQuery = (req, res, next) => {
  const schema = Joi.object({
    format: Joi.string().valid('pdf', 'excel').default('pdf')
      .messages({ 'any.only': "Format must be either 'pdf' or 'excel'." }),
  });

  const { error, value } = schema.validate(req.query, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid report query parameters.',
      errors: error.details.map((d) => d.message),
    });
  }
  req.query = value;
  next();
};
