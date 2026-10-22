/**
 * models/PerformanceScore.js
 * --------------------------
 * Calculated KPI score derived from a PerformanceEntry.
 *
 * Score Calculation Logic (see utils/scoreCalculator.js, Stage 5):
 *
 *   if KPI.higher_is_better:
 *     raw_score = (actual_value / target_value) × 100
 *   else:
 *     raw_score = (target_value / actual_value) × 100
 *
 *   score = MIN(raw_score, 100)   ← capped at 100 (cannot exceed perfect)
 *
 * Grades:
 *   A  90 – 100
 *   B  75 –  89
 *   C  60 –  74
 *   D  40 –  59
 *   F   0 –  39
 *
 * Relationships (defined in models/index.js):
 *   - belongs to Department
 *   - belongs to KPI
 *   - belongs to PerformanceEntry  (1:1 — one score per entry)
 */

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export const SCORE_GRADES = Object.freeze(['A', 'B', 'C', 'D', 'F']);

/**
 * Derive a letter grade from a numeric score (0–100).
 * Called at seed time and will be called by the score engine in Stage 5.
 */
export const deriveGrade = (score) => {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};

/**
 * Calculate the raw score from actual vs target.
 */
export const calculateScore = (actualValue, targetValue, higherIsBetter) => {
  if (targetValue === 0) return 0;
  const raw = higherIsBetter
    ? (actualValue / targetValue) * 100
    : (targetValue / actualValue) * 100;
  return Math.min(parseFloat(raw.toFixed(2)), 100);
};

class PerformanceScore extends Model {}

PerformanceScore.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    performance_entry_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: {
        name: 'uq_score_per_entry',
        msg: 'A score already exists for this performance entry.',
      },
      comment: 'FK → performance_entries.id (1:1)',
    },

    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK → departments.id (denormalised for fast queries)',
    },

    kpi_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK → kpis.id (denormalised for fast queries)',
    },

    period_year: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },

    period_month: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },

    score: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      validate: {
        min: { args: [0],   msg: 'Score cannot be negative.' },
        max: { args: [100], msg: 'Score cannot exceed 100.' },
      },
      comment: 'Computed score 0–100',
    },

    grade: {
      type: DataTypes.ENUM(...SCORE_GRADES),
      allowNull: false,
      comment: 'Letter grade: A (≥90), B (≥75), C (≥60), D (≥40), F (<40)',
    },

    calculated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the score was (re)calculated',
    },
  },
  {
    sequelize,
    modelName: 'PerformanceScore',
    tableName: 'performance_scores',
    underscored: true,
    timestamps: true,

    indexes: [
      { fields: ['department_id', 'period_year', 'period_month'] },
      { fields: ['kpi_id', 'period_year', 'period_month'] },
      { fields: ['score'] },
      { fields: ['grade'] },
    ],

    comment: 'Pre-computed KPI scores derived from performance entries',
  }
);

export default PerformanceScore;
