/**
 * validators/forecastValidator.js
 * -------------------------------
 * Joi validation schema for Stage 10 Forecasting endpoints.
 */

import Joi from 'joi';

export const validateForecastQuery = (req, res, next) => {
  const schema = Joi.object({
    horizon: Joi.number().integer().min(1).max(6).default(3).optional().messages({
      'number.min': 'Forecast horizon must project at least 1 period ahead.',
      'number.max': 'Forecast horizon cannot exceed 6 periods ahead given sample constraints.',
    }),
  });

  const { error, value } = schema.validate(req.query, { abortEarly: false });
  if (error) {
    const errorDetails = error.details.map((detail) => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid forecast query parameters.',
      errors: errorDetails,
    });
  }

  req.query = value;
  next();
};

export const validateForecastParams = (req, res, next) => {
  const schema = Joi.object({
    id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID parameter must be an integer.',
      'any.required': 'ID parameter is required.',
    }),
  });

  const { error, value } = schema.validate(req.params, { abortEarly: false });
  if (error) {
    const errorDetails = error.details.map((detail) => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid route parameters.',
      errors: errorDetails,
    });
  }

  req.params = value;
  next();
};
