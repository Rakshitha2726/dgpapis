/**
 * validators/anomalyValidator.js
 * ------------------------------
 * Joi validation schema for Stage 9 Anomaly Detection and Data Quality endpoints.
 */

import Joi from 'joi';

export const validateAnomalyQuery = (req, res, next) => {
  const schema = Joi.object({
    period_year: Joi.number().integer().min(2000).max(2100).optional().messages({
      'number.min': 'Reporting year must be 2000 or later.',
      'number.max': 'Reporting year cannot exceed 2100.',
    }),
    period_month: Joi.number().integer().min(1).max(12).optional().messages({
      'number.min': 'Reporting month must be between 1 and 12.',
      'number.max': 'Reporting month must be between 1 and 12.',
    }),
    department_id: Joi.number().integer().positive().optional().messages({
      'number.base': 'Department ID must be a valid integer.',
    }),
    severity: Joi.string().valid('HIGH', 'MEDIUM', 'LOW', 'all', 'ALL').optional().messages({
      'any.only': 'Severity must be one of: HIGH, MEDIUM, LOW, or all.',
    }),
    check_type: Joi.string().valid('HISTORICAL_ANOMALY', 'DATA_QUALITY_RULE', 'COMPLETENESS', 'all', 'ALL').optional().messages({
      'any.only': 'Check type must be one of: HISTORICAL_ANOMALY, DATA_QUALITY_RULE, COMPLETENESS, or all.',
    }),
  });

  const { error, value } = schema.validate(req.query, { abortEarly: false });
  if (error) {
    const errorDetails = error.details.map((detail) => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters.',
      errors: errorDetails,
    });
  }

  req.query = value;
  next();
};
