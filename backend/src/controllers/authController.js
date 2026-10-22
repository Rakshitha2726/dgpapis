import jwt from 'jsonwebtoken';
import { User, Department } from '../models/index.js';

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_dgpapis_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      department_id: user.department_id
    },
    secret,
    { expiresIn }
  );
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({
    where: { email },
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code']
      }
    ]
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    });
  }

  if (!user.is_active) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been deactivated. Contact system administrator.'
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    });
  }

  // Update last login timestamp
  user.last_login_at = new Date();
  await user.save();

  const token = generateToken(user);

  const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department_id: user.department_id,
    department: user.department,
    last_login_at: user.last_login_at
  };

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: userResponse
  });
};

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
};

export const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};
