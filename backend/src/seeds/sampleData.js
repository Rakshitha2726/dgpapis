/**
 * seeds/sampleData.js
 * -------------------
 * ⚠️  SAMPLE DATA ONLY — FOR DEVELOPMENT AND TESTING PURPOSES
 * ⚠️  DO NOT RUN IN PRODUCTION.
 *
 * Creates realistic but entirely fictional government data:
 *   - 4 departments
 *   - 7 users (1 admin, 4 officers, 2 policymakers)
 *   - 16 KPIs (4 per department)
 *   - 96 performance entries (4 KPIs × 6 months × 4 departments)
 *   - 96 performance scores (auto-calculated from entries)
 *
 * Default password for ALL seed users: Admin@1234
 * (bcrypt hash pre-computed – replace in production)
 *
 * Run via: npm run seed
 */

import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';
import { Department, User, KPI, PerformanceEntry, PerformanceScore } from '../models/index.js';
import { calculateScore, deriveGrade } from '../models/PerformanceScore.js';

// ─── Helper ──────────────────────────────────────────────────────────────────
const log = (msg) => console.log(`  [SEED] ${msg}`);

// ─── DEPARTMENTS ─────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  {
    name: 'Ministry of Finance',
    code: 'MOF',
    description: 'Responsible for fiscal policy, budget management, revenue collection, and public expenditure oversight.',
  },
  {
    name: 'Ministry of Health',
    code: 'MOH',
    description: 'Oversees public health policy, hospital management, healthcare delivery, and disease control.',
  },
  {
    name: 'Ministry of Education',
    code: 'MOE',
    description: 'Manages national education policy, school administration, curriculum development, and literacy programs.',
  },
  {
    name: 'Ministry of Public Works',
    code: 'MPW',
    description: 'Responsible for infrastructure development, road networks, public buildings, and maintenance.',
  },
];

// ─── KPIs per department ──────────────────────────────────────────────────────
// Each KPI entry: { name, description, unit, target_value, weight, higher_is_better, category }
const KPIS_BY_DEPT_CODE = {
  MOF: [
    {
      name: 'Budget Utilization Rate',
      description: 'Percentage of allocated annual budget actually spent on approved programmes.',
      unit: '%',
      target_value: 95,
      weight: 9,
      higher_is_better: true,
      category: 'financial',
    },
    {
      name: 'Revenue Collection Efficiency',
      description: 'Percentage of projected government revenue that has been collected in the period.',
      unit: '%',
      target_value: 90,
      weight: 10,
      higher_is_better: true,
      category: 'financial',
    },
    {
      name: 'Audit Compliance Score',
      description: 'Percentage of audit recommendations implemented within the agreed timeframe.',
      unit: '%',
      target_value: 85,
      weight: 7,
      higher_is_better: true,
      category: 'compliance',
    },
    {
      name: 'Payment Processing Time',
      description: 'Average number of working days to process approved vendor or supplier payments.',
      unit: 'days',
      target_value: 5,
      weight: 6,
      higher_is_better: false, // lower is better
      category: 'operational_efficiency',
    },
  ],
  MOH: [
    {
      name: 'Patient Satisfaction Rate',
      description: 'Percentage of patients rating hospital services as satisfactory or above in quarterly surveys.',
      unit: '%',
      target_value: 85,
      weight: 9,
      higher_is_better: true,
      category: 'service_delivery',
    },
    {
      name: 'Hospital Bed Occupancy Rate',
      description: 'Percentage of available hospital beds occupied, averaged across all public facilities.',
      unit: '%',
      target_value: 80,
      weight: 7,
      higher_is_better: true,
      category: 'operational_efficiency',
    },
    {
      name: 'Essential Medicine Availability',
      description: 'Percentage of essential medicines listed on the national formulary in stock at public pharmacies.',
      unit: '%',
      target_value: 95,
      weight: 10,
      higher_is_better: true,
      category: 'service_delivery',
    },
    {
      name: 'Emergency Response Time',
      description: 'Average time in minutes from emergency call to ambulance arrival at scene.',
      unit: 'minutes',
      target_value: 15,
      weight: 8,
      higher_is_better: false, // lower is better
      category: 'service_delivery',
    },
  ],
  MOE: [
    {
      name: 'Gross Enrollment Rate',
      description: 'Percentage of school-age children enrolled in public primary and secondary schools.',
      unit: '%',
      target_value: 95,
      weight: 10,
      higher_is_better: true,
      category: 'service_delivery',
    },
    {
      name: 'Student–Teacher Ratio Compliance',
      description: 'Percentage of classrooms meeting the national standard of ≤30 students per teacher.',
      unit: '%',
      target_value: 80,
      weight: 8,
      higher_is_better: true,
      category: 'human_resources',
    },
    {
      name: 'Annual Dropout Rate',
      description: 'Percentage of enrolled students who leave school before completing the academic year.',
      unit: '%',
      target_value: 3,
      weight: 9,
      higher_is_better: false, // lower is better
      category: 'service_delivery',
    },
    {
      name: 'Teacher Training Completion',
      description: 'Percentage of active teachers who have completed the mandatory annual professional development programme.',
      unit: '%',
      target_value: 90,
      weight: 7,
      higher_is_better: true,
      category: 'human_resources',
    },
  ],
  MPW: [
    {
      name: 'Road Project Completion Rate',
      description: 'Percentage of planned road construction and rehabilitation projects completed within the financial year.',
      unit: '%',
      target_value: 85,
      weight: 10,
      higher_is_better: true,
      category: 'infrastructure',
    },
    {
      name: 'Infrastructure Maintenance Coverage',
      description: 'Percentage of public infrastructure assets that received scheduled preventive maintenance.',
      unit: '%',
      target_value: 80,
      weight: 8,
      higher_is_better: true,
      category: 'infrastructure',
    },
    {
      name: 'Project Budget Variance',
      description: 'Average percentage by which actual project costs deviate from approved budgets (target: keep under 10%).',
      unit: '%',
      target_value: 10,
      weight: 9,
      higher_is_better: false, // lower variance is better
      category: 'financial',
    },
    {
      name: 'Contractor Performance Score',
      description: 'Average score (out of 100) given to contractors based on quality inspections and deadline adherence.',
      unit: 'score',
      target_value: 75,
      weight: 7,
      higher_is_better: true,
      category: 'compliance',
    },
  ],
};

// ─── Performance values per KPI × month ──────────────────────────────────────
// Realistic monthly actuals for Jan–Jun 2025 (some above, some below target)
// Format: [jan, feb, mar, apr, may, jun]
const ACTUALS_BY_DEPT = {
  MOF: [
    // Budget Utilization Rate (target 95%)
    [72, 75, 78, 81, 85, 88],
    // Revenue Collection Efficiency (target 90%)
    [84, 86, 88, 87, 91, 93],
    // Audit Compliance Score (target 85%)
    [78, 79, 82, 83, 85, 87],
    // Payment Processing Time (target 5 days, lower is better)
    [9, 8, 7, 6, 5, 5],
  ],
  MOH: [
    // Patient Satisfaction Rate (target 85%)
    [79, 80, 81, 83, 84, 87],
    // Hospital Bed Occupancy Rate (target 80%)
    [71, 73, 76, 78, 80, 82],
    // Essential Medicine Availability (target 95%)
    [89, 90, 91, 93, 94, 96],
    // Emergency Response Time (target 15 min, lower is better)
    [22, 21, 19, 18, 17, 16],
  ],
  MOE: [
    // Gross Enrollment Rate (target 95%)
    [87, 88, 89, 90, 91, 92],
    // Student–Teacher Ratio Compliance (target 80%)
    [65, 67, 69, 72, 75, 77],
    // Annual Dropout Rate (target 3%, lower is better)
    [7.2, 6.8, 6.1, 5.5, 4.9, 4.4],
    // Teacher Training Completion (target 90%)
    [55, 62, 70, 76, 83, 88],
  ],
  MPW: [
    // Road Project Completion Rate (target 85%)
    [40, 48, 55, 62, 70, 78],
    // Infrastructure Maintenance Coverage (target 80%)
    [60, 63, 67, 70, 74, 77],
    // Project Budget Variance (target ≤10%, lower is better)
    [18, 16, 14, 13, 12, 11],
    // Contractor Performance Score (target 75)
    [65, 67, 69, 70, 72, 74],
  ],
};

// ─── Seed function ────────────────────────────────────────────────────────────
export const seedDatabase = async () => {
  // Pre-compute bcrypt hash once (cost factor 10) for all seed users.
  // Plain-text password: Admin@1234
  log('Hashing seed passwords…');
  const passwordHash = await bcrypt.hash('Admin@1234', 10);

  // ── 1. Departments ──────────────────────────────────────────────────────
  log('Inserting departments…');
  const deptRecords = await Promise.all(
    DEPARTMENTS.map((d) =>
      Department.findOrCreate({ where: { code: d.code }, defaults: d }).then(([rec]) => rec)
    )
  );
  const deptMap = Object.fromEntries(deptRecords.map((d) => [d.code, d]));
  log(`  → ${deptRecords.length} departments ready.`);

  // ── 2. Users ────────────────────────────────────────────────────────────
  log('Inserting users…');
  const USERS = [
    {
      name: 'System Administrator',
      email: 'admin@dgpapis.gov',
      password_hash: passwordHash,
      role: 'admin',
      department_id: null,
    },
    {
      name: 'Finance Officer',
      email: 'officer.finance@dgpapis.gov',
      password_hash: passwordHash,
      role: 'department_officer',
      department_id: deptMap['MOF'].id,
    },
    {
      name: 'Health Officer',
      email: 'officer.health@dgpapis.gov',
      password_hash: passwordHash,
      role: 'department_officer',
      department_id: deptMap['MOH'].id,
    },
    {
      name: 'Education Officer',
      email: 'officer.education@dgpapis.gov',
      password_hash: passwordHash,
      role: 'department_officer',
      department_id: deptMap['MOE'].id,
    },
    {
      name: 'Works Officer',
      email: 'officer.works@dgpapis.gov',
      password_hash: passwordHash,
      role: 'department_officer',
      department_id: deptMap['MPW'].id,
    },
    {
      name: 'Senior Policy Analyst',
      email: 'analyst1@dgpapis.gov',
      password_hash: passwordHash,
      role: 'policymaker',
      department_id: null,
    },
    {
      name: 'Deputy Secretary General',
      email: 'dsg@dgpapis.gov',
      password_hash: passwordHash,
      role: 'policymaker',
      department_id: null,
    },
  ];

  const userRecords = await Promise.all(
    USERS.map((u) =>
      User.findOrCreate({ where: { email: u.email }, defaults: u }).then(([rec]) => rec)
    )
  );
  // Map officer email → user record for FK reference later
  const officerMap = {
    MOF: userRecords.find((u) => u.email === 'officer.finance@dgpapis.gov'),
    MOH: userRecords.find((u) => u.email === 'officer.health@dgpapis.gov'),
    MOE: userRecords.find((u) => u.email === 'officer.education@dgpapis.gov'),
    MPW: userRecords.find((u) => u.email === 'officer.works@dgpapis.gov'),
  };
  log(`  → ${userRecords.length} users ready.`);

  // ── 3. KPIs ─────────────────────────────────────────────────────────────
  log('Inserting KPIs…');
  const kpiMap = {}; // { DEPTCODE: [kpi0, kpi1, kpi2, kpi3] }

  for (const [code, kpiDefs] of Object.entries(KPIS_BY_DEPT_CODE)) {
    const dept = deptMap[code];
    const kpis = await Promise.all(
      kpiDefs.map((k) =>
        KPI.findOrCreate({
          where: { name: k.name, department_id: dept.id },
          defaults: { ...k, department_id: dept.id },
        }).then(([rec]) => rec)
      )
    );
    kpiMap[code] = kpis;
  }
  const totalKPIs = Object.values(kpiMap).flat().length;
  log(`  → ${totalKPIs} KPIs ready.`);

  // ── 4. Performance Entries + Scores ─────────────────────────────────────
  log('Inserting performance entries and calculating scores…');
  const MONTHS = [1, 2, 3, 4, 5, 6]; // Jan–Jun 2025
  const YEAR   = 2025;
  let entryCount = 0;
  let scoreCount = 0;

  for (const code of Object.keys(deptMap)) {
    const dept    = deptMap[code];
    const kpis    = kpiMap[code];
    const officer = officerMap[code];
    const actuals = ACTUALS_BY_DEPT[code];

    for (let ki = 0; ki < kpis.length; ki++) {
      const kpi = kpis[ki];

      for (let mi = 0; mi < MONTHS.length; mi++) {
        const month       = MONTHS[mi];
        const actualValue = actuals[ki][mi];

        // Insert entry (skip if already exists due to unique constraint)
        const [entry, entryCreated] = await PerformanceEntry.findOrCreate({
          where: {
            department_id: dept.id,
            kpi_id:        kpi.id,
            period_year:   YEAR,
            period_month:  month,
          },
          defaults: {
            department_id: dept.id,
            kpi_id:        kpi.id,
            submitted_by:  officer.id,
            period_year:   YEAR,
            period_month:  month,
            actual_value:  actualValue,
            status:        'approved', // Seed data is pre-approved
            notes: `[SAMPLE DATA] Reported value for ${kpi.name} – ${YEAR}-${String(month).padStart(2, '0')}`,
          },
        });
        if (entryCreated) entryCount++;

        // Calculate and insert score
        const score = calculateScore(
          Number(actualValue),
          Number(kpi.target_value),
          kpi.higher_is_better
        );
        const grade = deriveGrade(score);

        await PerformanceScore.findOrCreate({
          where: { performance_entry_id: entry.id },
          defaults: {
            performance_entry_id: entry.id,
            department_id:        dept.id,
            kpi_id:               kpi.id,
            period_year:          YEAR,
            period_month:         month,
            score,
            grade,
            calculated_at: new Date(),
          },
        }).then(([, created]) => { if (created) scoreCount++; });
      }
    }
  }

  log(`  → ${entryCount} performance entries created.`);
  log(`  → ${scoreCount} performance scores calculated.`);

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              DATABASE SEEDING COMPLETE ✅                  ║');
  console.log('║                                                            ║');
  console.log('║  ⚠️  SAMPLE DATA ONLY – NOT FOR PRODUCTION USE            ║');
  console.log('║                                                            ║');
  console.log('║  Default password for all users:  Admin@1234              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
};
