/**
 * models/index.js
 * ---------------
 * Central hub for all Sequelize models.
 *
 * Responsibilities:
 *  1. Import every model (ensures they are registered with the sequelize instance)
 *  2. Define all associations (foreign keys / join columns)
 *  3. Re-export models for use in controllers and routes
 *
 * ─── Entity Relationship Summary ───────────────────────────────────────────
 *
 *  departments ──< users               (1 dept : M officers)
 *  departments ──< kpis                (1 dept : M KPIs)
 *  departments ──< performance_entries (1 dept : M entries)
 *  departments ──< performance_scores  (1 dept : M KPI-level scores)
 *  departments ──< department_scores   (1 dept : M period-level aggregate scores) [Stage 7]
 *
 *  kpis        ──< performance_entries (1 KPI  : M entries)
 *  kpis        ──< performance_scores  (1 KPI  : M scores)
 *
 *  users       ──< performance_entries (1 user : M entries they submitted)
 *
 *  performance_entries ──┤ performance_scores  (1 entry : 1 score)
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

import Department      from './Department.js';
import User            from './User.js';
import KPI             from './KPI.js';
import PerformanceEntry from './PerformanceEntry.js';
import PerformanceScore from './PerformanceScore.js';
import DepartmentScore  from './DepartmentScore.js';

// ── Department ↔ User ────────────────────────────────────────────────────
Department.hasMany(User, {
  foreignKey: { name: 'department_id', allowNull: true },
  as: 'users',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
User.belongsTo(Department, {
  foreignKey: { name: 'department_id', allowNull: true },
  as: 'department',
});

// ── Department ↔ KPI ─────────────────────────────────────────────────────
Department.hasMany(KPI, {
  foreignKey: { name: 'department_id', allowNull: false },
  as: 'kpis',
  onDelete: 'RESTRICT',  // Cannot delete a dept that still has KPIs
  onUpdate: 'CASCADE',
});
KPI.belongsTo(Department, {
  foreignKey: { name: 'department_id', allowNull: false },
  as: 'department',
});

// ── Department ↔ PerformanceEntry ────────────────────────────────────────
Department.hasMany(PerformanceEntry, {
  foreignKey: { name: 'department_id', allowNull: false },
  as: 'performanceEntries',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
PerformanceEntry.belongsTo(Department, {
  foreignKey: { name: 'department_id', allowNull: false },
  as: 'department',
});

// ── Department ↔ PerformanceScore ────────────────────────────────────────
Department.hasMany(PerformanceScore, {
  foreignKey: { name: 'department_id', allowNull: false },
  as: 'performanceScores',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
PerformanceScore.belongsTo(Department, {
  foreignKey: { name: 'department_id', allowNull: false },
  as: 'department',
});

// ── KPI ↔ PerformanceEntry ───────────────────────────────────────────────
KPI.hasMany(PerformanceEntry, {
  foreignKey: { name: 'kpi_id', allowNull: false },
  as: 'performanceEntries',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
PerformanceEntry.belongsTo(KPI, {
  foreignKey: { name: 'kpi_id', allowNull: false },
  as: 'kpi',
});

// ── KPI ↔ PerformanceScore ───────────────────────────────────────────────
KPI.hasMany(PerformanceScore, {
  foreignKey: { name: 'kpi_id', allowNull: false },
  as: 'performanceScores',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
PerformanceScore.belongsTo(KPI, {
  foreignKey: { name: 'kpi_id', allowNull: false },
  as: 'kpi',
});

// ── User ↔ PerformanceEntry ──────────────────────────────────────────────
User.hasMany(PerformanceEntry, {
  foreignKey: { name: 'submitted_by', allowNull: false },
  as: 'submittedEntries',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
PerformanceEntry.belongsTo(User, {
  foreignKey: { name: 'submitted_by', allowNull: false },
  as: 'submittedBy',
});

// ── PerformanceEntry ↔ PerformanceScore (1:1) ────────────────────────────
PerformanceEntry.hasOne(PerformanceScore, {
  foreignKey: { name: 'performance_entry_id', allowNull: false },
  as: 'score',
  onDelete: 'CASCADE',   // Deleting an entry also removes its score
  onUpdate: 'CASCADE',
});
PerformanceScore.belongsTo(PerformanceEntry, {
  foreignKey: { name: 'performance_entry_id', allowNull: false },
  as: 'entry',
});

// ── Department ↔ DepartmentScore (Stage 7: Aggregate dept score per period) ──
Department.hasMany(DepartmentScore, {
  foreignKey: { name: 'department_id', allowNull: false },
  as: 'departmentScores',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
DepartmentScore.belongsTo(Department, {
  foreignKey: { name: 'department_id', allowNull: false },
  as: 'department',
});

// ── Named exports ─────────────────────────────────────────────────────────
export {
  Department,
  User,
  KPI,
  PerformanceEntry,
  PerformanceScore,
  DepartmentScore,
};
