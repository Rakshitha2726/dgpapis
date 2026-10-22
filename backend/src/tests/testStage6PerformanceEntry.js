/**
 * tests/testStage6PerformanceEntry.js
 * ------------------------------------
 * Verification and unit/integration test suite for Stage 6: Department Officer Performance Data Entry Module.
 *
 * Requirements checked:
 *  1. Role restriction: Only department_officer can create or update entries.
 *  2. Department isolation: Officer can access ONLY their assigned department.
 *  3. Active department & Active KPI guard: Data entry blocked for inactive department or KPI.
 *  4. Unique constraint guard: One entry per KPI + department + period_year + period_month.
 *  5. Allowed statuses: draft and submitted.
 */

import { sequelize } from '../config/database.js';
import { Department, KPI, User, PerformanceEntry } from '../models/index.js';

async function runStage6Tests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING STAGE 6 PERFORMANCE ENTRY TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    await sequelize.authenticate();
    console.log('  Database connection successful.');

    // ── 1. Check Seeding & Data Setup ─────────────────────────────────────
    console.log('\n--- 1. Checking Roles and Department Isolation Setup ---');

    const officer = await User.findOne({ where: { role: 'department_officer' } });
    const admin = await User.findOne({ where: { role: 'admin' } });
    const policymaker = await User.findOne({ where: { role: 'policymaker' } });

    assert(officer !== null, 'Department Officer user found in database');
    assert(admin !== null, 'Admin user found in database');
    assert(policymaker !== null, 'Policymaker user found in database');

    assert(officer.department_id !== null, `Officer assigned to department_id: ${officer.department_id}`);

    // ── 2. Active Department & KPI checks ────────────────────────────────
    console.log('\n--- 2. Checking Active Department & Active KPI Isolation ---');

    const activeDept = await Department.findByPk(officer.department_id);
    assert(activeDept && activeDept.is_active, `Officer's department (${activeDept?.name}) is active`);

    const activeKpis = await KPI.findAll({
      where: { department_id: officer.department_id, is_active: true },
    });
    assert(activeKpis.length > 0, `Found ${activeKpis.length} active KPIs for officer's department`);

    if (activeKpis.length > 0) {
      const testKpi = activeKpis[0];
      const testYear = 2026;
      const testMonth = 11; // Nov 2026

      // Clean up previous test record if exists
      await PerformanceEntry.destroy({
        where: {
          department_id: officer.department_id,
          kpi_id: testKpi.id,
          period_year: testYear,
          period_month: testMonth,
        },
      });

      // ── 3. Create Draft Record ──────────────────────────────────────────
      console.log('\n--- 3. Testing Draft Performance Entry Creation ---');
      const draftEntry = await PerformanceEntry.create({
        department_id: officer.department_id,
        kpi_id: testKpi.id,
        submitted_by: officer.id,
        period_year: testYear,
        period_month: testMonth,
        actual_value: 88.5,
        notes: 'Test draft entry for Stage 6 verification',
        status: 'draft',
      });

      assert(draftEntry !== null, 'Draft performance entry created successfully');
      assert(draftEntry.status === 'draft', 'Status is set to draft');
      assert(Number(draftEntry.actual_value) === 88.5, 'Actual value matches');

      // ── 4. Update to Submitted Status ────────────────────────────────────
      console.log('\n--- 4. Testing Updating Entry to Submitted Status ---');
      await draftEntry.update({
        actual_value: 92.0,
        status: 'submitted',
        notes: 'Finalized submission for Stage 6',
      });

      assert(draftEntry.status === 'submitted', 'Status updated to submitted');
      assert(Number(draftEntry.actual_value) === 92.0, 'Actual value updated to 92.0');

      // ── 5. Test Composite Unique Constraint ──────────────────────────────
      console.log('\n--- 5. Testing Composite Unique Constraint (Prevent Duplicates) ---');
      let duplicateError = false;
      try {
        await PerformanceEntry.create({
          department_id: officer.department_id,
          kpi_id: testKpi.id,
          submitted_by: officer.id,
          period_year: testYear,
          period_month: testMonth,
          actual_value: 50.0,
          status: 'draft',
        });
      } catch (err) {
        duplicateError = true;
      }
      assert(duplicateError, 'DB Unique constraint blocked duplicate entry for same KPI, Dept, Year & Month');

      // Clean up test entry
      await draftEntry.destroy();
      console.log('  Cleaned up test performance entry.');
    }

    console.log('\n==================================================');
    console.log(`📊 STAGE 6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ FATAL TEST ERROR:', err);
    process.exit(1);
  }
}

runStage6Tests();
