import Joi from 'joi';

const ALLOWED_STATUSES = ['draft', 'submitted'];

export const validateCreatePerformanceEntry = (req, res, next) => {
  const schema = Joi.object({
    kpi_id: Joi.number().integer().positive().required().messages({
      'number.base': 'KPI ID must be a valid integer.',
      'any.required': 'KPI selection is required.'
    }),
    period_year: Joi.number().integer().min(2000).max(2100).required().messages({
      'number.min': 'Reporting year must be 2000 or later.',
      'number.max': 'Reporting year cannot exceed 2100.',
      'any.required': 'Reporting year is required.'
    }),
    period_month: Joi.number().integer().min(1).max(12).required().messages({
      'number.min': 'Reporting month must be between 1 and 12.',
      'number.max': 'Reporting month must be between 1 and 12.',
      'any.required': 'Reporting month is required.'
    }),
    actual_value: Joi.number().min(0).required().messages({
      'number.min': 'Actual KPI value cannot be negative.',
      'any.required': 'Actual value is required.'
    }),
    notes: Joi.string().trim().allow('', null).max(1000).messages({
      'string.max': 'Notes cannot exceed 1000 characters.'
    }),
    status: Joi.string().valid(...ALLOWED_STATUSES).default('draft').messages({
      'any.only': 'Status must be either "draft" or "submitted".'
    })
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorDetails = error.details.map((detail) => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorDetails
    });
  }

  req.body = value;
  next();
};

export const validateUpdatePerformanceEntry = (req, res, next) => {
  const schema = Joi.object({
    actual_value: Joi.number().min(0).messages({
      'number.min': 'Actual KPI value cannot be negative.'
    }),
    notes: Joi.string().trim().allow('', null).max(1000).messages({
      'string.max': 'Notes cannot exceed 1000 characters.'
    }),
    status: Joi.string().valid(...ALLOWED_STATUSES).messages({
      'any.only': 'Status must be either "draft" or "submitted".'
    })
  }).min(1).messages({
    'object.min': 'Please provide at least one field to update.'
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorDetails = error.details.map((detail) => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorDetails
    });
  }

  req.body = value;
  next();
};
