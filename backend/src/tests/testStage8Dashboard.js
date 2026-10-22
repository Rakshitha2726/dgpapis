/**
 * tests/testStage8Dashboard.js
 * -----------------------------
 * Integration test suite for Stage 8 Dashboard Endpoints.
 *
 * Verifies:
 *  1. Admin stats aggregation endpoint.
 *  2. Officer summary endpoint with strict department isolation.
 *  3. Policymaker summary endpoint with cross-department rankings and analytics.
 */

import { sequelize } from '../config/database.js';
import { User, Department } from '../models/index.js';
import {
  getAdminDashboardStats,
  getOfficerDashboardSummary,
  getPolicymakerDashboardSummary,
} from '../controllers/dashboardController.js';

async function runStage8DashboardTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING STAGE 8 DASHBOARD INTEGRATION TEST SUITE');
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

  // Dummy response mock builder
  function createMockRes() {
    const res = {
      statusCode: 200,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.data = payload;
        return this;
      },
    };
    return res;
  }

  try {
    await sequelize.authenticate();
    console.log('  Database connection successful.');

    // Fetch users for role testing
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    const officerUser = await User.findOne({ where: { role: 'department_officer' } });
    const policymakerUser = await User.findOne({ where: { role: 'policymaker' } });

    assert(adminUser !== null, 'Admin user exists for testing');
    assert(officerUser !== null, 'Department Officer user exists for testing');
    assert(policymakerUser !== null, 'Policymaker user exists for testing');

    // ── 1. Admin Stats Dashboard Endpoint ──────────────────────────────────
    console.log('\n--- 1. Testing Admin Dashboard Endpoint ---');
    const adminReq = { user: adminUser };
    const adminRes = createMockRes();

    await getAdminDashboardStats(adminReq, adminRes);
    assert(adminRes.statusCode === 200, 'Admin stats returned HTTP 200');
    assert(adminRes.data?.success === true, 'Response marked success');
    assert(typeof adminRes.data?.stats?.total_departments === 'number', 'Total departments count returned');
    assert(typeof adminRes.data?.stats?.active_kpis === 'number', 'Active KPIs count returned');
    assert(Array.isArray(adminRes.data?.recent_activity), 'Recent activity array returned');

    // ── 2. Department Officer Summary Endpoint ─────────────────────────────
    console.log('\n--- 2. Testing Officer Dashboard Endpoint (Department Isolated) ---');
    const officerReq = { user: officerUser };
    const officerRes = createMockRes();

    await getOfficerDashboardSummary(officerReq, officerRes);
    assert(officerRes.statusCode === 200, 'Officer summary returned HTTP 200');
    assert(officerRes.data?.success === true, 'Response marked success');
    assert(officerRes.data?.department?.id === officerUser.department_id, `Data isolated strictly to officer department_id (${officerUser.department_id})`);
    assert(Array.isArray(officerRes.data?.active_kpis), 'Officer department active KPIs array returned');
    assert(Array.isArray(officerRes.data?.history_trend), 'Officer department score history trend returned');

    // ── 3. Senior Policymaker Summary Endpoint ────────────────────────────
    console.log('\n--- 3. Testing Policymaker Dashboard Endpoint ---');
    const policymakerReq = { user: policymakerUser, query: { period_year: 2026, period_month: 9 } };
    const policymakerRes = createMockRes();

    await getPolicymakerDashboardSummary(policymakerReq, policymakerRes);
    assert(policymakerRes.statusCode === 200, 'Policymaker summary returned HTTP 200');
    assert(policymakerRes.data?.success === true, 'Response marked success');
    assert(typeof policymakerRes.data?.overview?.total_active_departments === 'number', 'Active departments overview count returned');
    assert(Array.isArray(policymakerRes.data?.rankings?.ranked_departments), 'Cross-department ranked departments returned');
    assert(Array.isArray(policymakerRes.data?.rankings?.unranked_departments), 'Unranked incomplete departments returned');

    console.log('\n==================================================');
    console.log(`📊 STAGE 8 DASHBOARD TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

runStage8DashboardTests();
