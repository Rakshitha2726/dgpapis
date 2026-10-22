/**
 * models/User.js
 * --------------
 * Platform users with three roles:
 *   - admin            → manages departments, users, KPIs
 *   - department_officer → enters performance data for their department
 *   - policymaker      → views reports, comparisons, trends
 *
 * Relationships (defined in models/index.js):
 *   - belongs to Department  (nullable – admins/policymakers have no department)
 *   - has many PerformanceEntries (entries they submitted)
 */

import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';

// Valid roles as a constant – reused in validators and middleware later
export const USER_ROLES = Object.freeze({
  ADMIN:    'admin',
  OFFICER:  'department_officer',
  POLICY:   'policymaker',
});

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name cannot be empty.' },
        len: { args: [2, 100], msg: 'Name must be 2–100 characters.' },
      },
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: {
        name: 'uq_users_email',
        msg: 'An account with this email already exists.',
      },
      validate: {
        isEmail: { msg: 'Must be a valid email address.' },
        notEmpty: true,
      },
    },

    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'bcrypt hash of the user\'s password. Never store plain-text.',
    },

    role: {
      type: DataTypes.ENUM(...Object.values(USER_ROLES)),
      allowNull: false,
      comment: 'Controls what the user can see and do in the system',
    },

    // FK column declared here; the association is set in models/index.js
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,     // null for admin and policymaker roles
      comment: 'FK → departments.id. Only department_officer users are linked to a department.',
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Soft-delete / account-disable flag',
    },

    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of the most recent successful login',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    timestamps: true,
    comment: 'System users – admins, department officers, and policymakers',
  }
);

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

export default User;
