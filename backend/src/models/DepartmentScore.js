/**
 * models/DepartmentScore.js
 * -------------------------
 * Aggregated department-level performance score for a reporting period.
 *
 * Calculated from:
 *   Σ (Normalized KPI Score × KPI Weight / 100) for all submitted, active KPIs in the period.
 *
 * ⚠️  ILLUSTRATIVE PROJECT VALUES:
 *   Score thresholds (Excellent / Good / Needs Improvement / Poor) are project evaluation
 *   categories used for demonstration purposes. They are NOT official government standards.
 *
 * Score Thresholds (Illustrative):
 *   Excellent        90 – 100
 *   Good             75 – 89.99
 *   Needs Improvement 60 – 74.99
 *   Poor              0 – 59.99
 *
 * Relationships (defined in models/index.js):
 *   - belongs to Department
 */

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export const DEPT_SCORE_STATUSES = Object.freeze({
  INCOMPLETE: 'incomplete',  // One or more active KPIs have no submitted entry for this period
  COMPLETE:   'complete',    // All active KPIs have submitted entries – score is final
});

export const PERFORMANCE_LABELS = Object.freeze({
  EXCELLENT:          'Excellent',
  GOOD:               'Good',
  NEEDS_IMPROVEMENT:  'Needs Improvement',
  POOR:               'Poor',
});

/**
 * Derive a human-readable performance label from a numeric overall score.
 * ⚠️  These thresholds are ILLUSTRATIVE PROJECT VALUES, not official government standards.
 */
export const derivePerformanceLabel = (score) => {
  if (score >= 90) return PERFORMANCE_LABELS.EXCELLENT;
  if (score >= 75) return PERFORMANCE_LABELS.GOOD;
  if (score >= 60) return PERFORMANCE_LABELS.NEEDS_IMPROVEMENT;
  return PERFORMANCE_LABELS.POOR;
};

class DepartmentScore extends Model {}

DepartmentScore.init(
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

    period_year: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: {
        min: { args: [2000], msg: 'Year must be 2000 or later.' },
        max: { args: [2100], msg: 'Year seems too far in the future.' },
      },
    },

    period_month: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: {
        min: { args: [1],  msg: 'Month must be 1–12.' },
        max: { args: [12], msg: 'Month must be 1–12.' },
      },
    },

    overall_score: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,  // NULL when status = 'incomplete'
      validate: {
        min: { args: [0],   msg: 'Score cannot be negative.' },
        max: { args: [100], msg: 'Score cannot exceed 100.' },
      },
      comment: 'Weighted aggregate score 0–100. NULL when data is incomplete.',
    },

    performance_label: {
      type: DataTypes.ENUM(...Object.values(PERFORMANCE_LABELS)),
      allowNull: true,
      comment: 'Illustrative label: Excellent / Good / Needs Improvement / Poor. NOT official government standard.',
    },

    data_status: {
      type: DataTypes.ENUM(...Object.values(DEPT_SCORE_STATUSES)),
      allowNull: false,
      defaultValue: DEPT_SCORE_STATUSES.INCOMPLETE,
      comment: 'complete = all active KPIs have submitted entries; incomplete = missing entries',
    },

    active_kpi_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total count of active KPIs for this department at calculation time',
    },

    submitted_kpi_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Count of active KPIs with submitted entries in this period',
    },

    missing_kpi_ids: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('missing_kpi_ids');
        return raw ? JSON.parse(raw) : [];
      },
      set(val) {
        this.setDataValue('missing_kpi_ids', val ? JSON.stringify(val) : null);
      },
      comment: 'JSON array of KPI IDs with no submitted entry for this period',
    },

    calculated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when this score was (re)calculated',
    },
  },
  {
    sequelize,
    modelName: 'DepartmentScore',
    tableName: 'department_scores',
    underscored: true,
    timestamps: true,

    indexes: [
      // Unique: one score record per department × period
      {
        unique: true,
        name: 'uq_dept_score_period',
        fields: ['department_id', 'period_year', 'period_month'],
      },
      { fields: ['period_year', 'period_month'] },
      { fields: ['overall_score'] },
      { fields: ['data_status'] },
    ],

    comment: 'Aggregated weighted department performance score per reporting period (Illustrative project model)',
  }
);

export default DepartmentScore;
