import Joi from 'joi';

export const validateCreateDepartment = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(3).max(150).required().messages({
      'string.empty': 'Department name is required.',
      'string.min': 'Department name must be at least 3 characters.',
      'string.max': 'Department name cannot exceed 150 characters.',
      'any.required': 'Department name is required.'
    }),
    code: Joi.string().trim().min(2).max(10).uppercase().pattern(/^[A-Z0-9_-]+$/).required().messages({
      'string.empty': 'Department code is required.',
      'string.min': 'Department code must be at least 2 characters.',
      'string.max': 'Department code cannot exceed 10 characters.',
      'string.pattern.base': 'Department code must contain only uppercase letters, numbers, hyphens, or underscores.',
      'any.required': 'Department code is required.'
    }),
    description: Joi.string().trim().allow('', null).max(1000).messages({
      'string.max': 'Description cannot exceed 1000 characters.'
    }),
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

export const validateUpdateDepartment = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(3).max(150).messages({
      'string.empty': 'Department name cannot be empty.',
      'string.min': 'Department name must be at least 3 characters.',
      'string.max': 'Department name cannot exceed 150 characters.'
    }),
    code: Joi.string().trim().min(2).max(10).uppercase().pattern(/^[A-Z0-9_-]+$/).messages({
      'string.empty': 'Department code cannot be empty.',
      'string.min': 'Department code must be at least 2 characters.',
      'string.max': 'Department code cannot exceed 10 characters.',
      'string.pattern.base': 'Department code must contain only uppercase letters, numbers, hyphens, or underscores.'
    }),
    description: Joi.string().trim().allow('', null).max(1000).messages({
      'string.max': 'Description cannot exceed 1000 characters.'
    }),
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
