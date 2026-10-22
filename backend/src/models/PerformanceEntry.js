/**
 * models/PerformanceEntry.js
 * --------------------------
 * Raw performance data submitted by a Department Officer for a specific KPI
 * in a given reporting period (year + month).
 *
 * Lifecycle:
 *   draft → submitted → approved
 *
 * Once approved, a PerformanceScore record is computed and stored.
 *
 * Relationships (defined in models/index.js):
 *   - belongs to Department
 *   - belongs to KPI
 *   - belongs to User (as 'submittedBy')
 *   - has one PerformanceScore
 */

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ENTRY_STATUSES = Object.freeze({
  DRAFT:     'draft',
  SUBMITTED: 'submitted',
  APPROVED:  'approved',
});

class PerformanceEntry extends Model {}

PerformanceEntry.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK → departments.id',
    },

    kpi_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK → kpis.id',
    },

    submitted_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK → users.id – the officer who entered this data',
    },

    period_year: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: {
        min: { args: [2000], msg: 'Year must be 2000 or later.' },
        max: { args: [2100], msg: 'Year seems too far in the future.' },
      },
      comment: 'The calendar year this entry covers',
    },

    period_month: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: {
        min: { args: [1],  msg: 'Month must be 1–12.' },
        max: { args: [12], msg: 'Month must be 1–12.' },
      },
      comment: 'The calendar month (1 = January … 12 = December)',
    },

    actual_value: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      validate: {
        isDecimal: true,
      },
      comment: 'The measured/achieved value for the KPI in this period',
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional context, caveats, or explanations for the reported value',
    },

    status: {
      type: DataTypes.ENUM(...Object.values(ENTRY_STATUSES)),
      allowNull: false,
      defaultValue: ENTRY_STATUSES.DRAFT,
      comment: 'Workflow status – draft → submitted → approved',
    },
  },
  {
    sequelize,
    modelName: 'PerformanceEntry',
    tableName: 'performance_entries',
    underscored: true,
    timestamps: true,

    indexes: [
      // Composite unique constraint: one entry per department-KPI-period
      {
        unique: true,
        name: 'uq_entry_dept_kpi_period',
        fields: ['department_id', 'kpi_id', 'period_year', 'period_month'],
      },
      // Frequently filtered columns
      { fields: ['department_id'] },
      { fields: ['kpi_id'] },
      { fields: ['period_year', 'period_month'] },
      { fields: ['status'] },
    ],

    comment: 'Raw KPI values submitted by department officers per reporting period',
  }
);

export default PerformanceEntry;
