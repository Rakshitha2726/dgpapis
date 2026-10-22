/**
 * models/Department.js
 * --------------------
 * Represents a government department (e.g. Ministry of Health).
 *
 * Relationships (defined in models/index.js):
 *   - has many Users        (one department can have multiple officers)
 *   - has many KPIs         (each KPI is scoped to one department)
 *   - has many PerformanceEntries
 *   - has many PerformanceScores
 */

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

class Department extends Model {}

Department.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Surrogate primary key',
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: {
        name: 'uq_departments_name',
        msg: 'A department with this name already exists.',
      },
      validate: {
        notEmpty: { msg: 'Department name cannot be empty.' },
        len: { args: [3, 150], msg: 'Name must be between 3 and 150 characters.' },
      },
      comment: 'Full official name of the department',
    },

    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: {
        name: 'uq_departments_code',
        msg: 'This department code is already in use.',
      },
      validate: {
        isUppercase: { msg: 'Code must be uppercase letters.' },
        notEmpty: true,
      },
      comment: 'Short uppercase identifier, e.g. MOF, MOH, MOE',
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Brief description of the department\'s mandate',
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Soft-delete flag – inactive departments are hidden from new entries',
    },
  },
  {
    sequelize,
    modelName: 'Department',
    tableName: 'departments',
    underscored: true,
    timestamps: true,
    comment: 'Government departments whose performance is assessed by the system',
  }
);

export default Department;
