import Joi from 'joi';

export const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address.',
      'string.empty': 'Email is required.',
      'any.required': 'Email is required.'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required.',
      'any.required': 'Password is required.'
    })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorDetails = error.details.map((detail) => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorDetails
    });
  }

  next();
};
