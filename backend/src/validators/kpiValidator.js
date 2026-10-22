import Joi from 'joi';
import { KPI_CATEGORIES } from '../models/KPI.js';

export const validateCreateKPI = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(3).max(200).required().messages({
      'string.empty': 'KPI name is required.',
      'string.min': 'KPI name must be at least 3 characters.',
      'string.max': 'KPI name cannot exceed 200 characters.',
      'any.required': 'KPI name is required.'
    }),
    department_id: Joi.number().integer().positive().required().messages({
      'number.base': 'Department ID must be a valid integer.',
      'any.required': 'Department ID is required.'
    }),
    unit: Joi.string().trim().max(30).required().messages({
      'string.empty': 'Unit is required (e.g., %, days, score).',
      'string.max': 'Unit cannot exceed 30 characters.',
      'any.required': 'Unit is required.'
    }),
    target_value: Joi.number().min(0).required().messages({
      'number.min': 'Target value cannot be negative.',
      'any.required': 'Target value is required.'
    }),
    weight: Joi.number().integer().min(1).max(100).required().messages({
      'number.min': 'Weight must be at least 1%.',
      'number.max': 'Weight cannot exceed 100%.',
      'any.required': 'Weight is required.'
    }),
    higher_is_better: Joi.boolean().required().messages({
      'any.required': 'You must specify whether higher or lower values represent better performance.'
    }),
    category: Joi.string().valid(...KPI_CATEGORIES).required().messages({
      'any.only': `Category must be one of: ${KPI_CATEGORIES.join(', ')}`,
      'any.required': 'KPI category is required.'
    }),
    description: Joi.string().trim().allow('', null).max(1000),
    is_active: Joi.boolean().default(true)
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

export const validateUpdateKPI = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(3).max(200),
    department_id: Joi.number().integer().positive(),
    unit: Joi.string().trim().max(30),
    target_value: Joi.number().min(0),
    weight: Joi.number().integer().min(1).max(100),
    higher_is_better: Joi.boolean(),
    category: Joi.string().valid(...KPI_CATEGORIES),
    description: Joi.string().trim().allow('', null).max(1000),
    is_active: Joi.boolean()
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

export const validateApplyPresets = (req, res, next) => {
  const schema = Joi.object({
    department_id: Joi.number().integer().positive().required().messages({
      'any.required': 'Department ID is required to apply research-paper KPI presets.'
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
