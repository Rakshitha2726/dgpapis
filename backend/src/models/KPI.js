/**
 * models/KPI.js
 * -------------
 * Key Performance Indicator definition for a department.
 *
 * Each KPI has:
 *   - A target value   → the benchmark the department should hit
 *   - A unit           → what the value represents (%, days, score, count …)
 *   - A weight (1-10)  → used for weighted aggregate score calculations
 *   - higher_is_better → governs scoring direction:
 *       true  → score = (actual / target) × 100   (e.g. budget utilization)
 *       false → score = (target / actual) × 100   (e.g. response time, dropout rate)
 *   - A category       → groups KPIs into thematic areas (efficiency, service …)
 *
 * Relationships (defined in models/index.js):
 *   - belongs to Department
 *   - has many PerformanceEntries
 *   - has many PerformanceScores
 */

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export const KPI_CATEGORIES = Object.freeze([
  'financial',
  'service_delivery',
  'operational_efficiency',
  'human_resources',
  'infrastructure',
  'compliance',
]);

class KPI extends Model {}

KPI.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'KPI name cannot be empty.' },
        len: { args: [3, 200] },
      },
      comment: 'Short descriptive name of the indicator',
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detailed explanation of what this KPI measures and how to collect it',
    },

    unit: {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: 'Measurement unit: %, days, score, count, ratio, etc.',
    },

    target_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: { args: [0], msg: 'Target value cannot be negative.' },
      },
      comment: 'Benchmark / goal the department should achieve or exceed',
    },

    weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: { args: [1], msg: 'Weight must be at least 1%.' },
        max: { args: [100], msg: 'Weight cannot exceed 100%.' },
      },
      comment: 'Relative weight percentage (1-100%) for aggregate scoring',
    },

    higher_is_better: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'true → higher actual = better score; false → lower actual = better score',
    },

    category: {
      type: DataTypes.ENUM(...KPI_CATEGORIES),
      allowNull: false,
      comment: 'Thematic area this KPI belongs to',
    },

    // FK column; association defined in models/index.js
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK → departments.id. Each KPI belongs to exactly one department.',
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Inactive KPIs are archived and excluded from new entries',
    },
  },
  {
    sequelize,
    modelName: 'KPI',
    tableName: 'kpis',
    underscored: true,
    timestamps: true,
    comment: 'Key Performance Indicators assigned to departments',
  }
);

export default KPI;
