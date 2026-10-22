/**
 * tests/testFileImportBatchFlow.js
 * --------------------------------
 * End-to-end integration and unit verification test suite for the
 * Department Officer Spreadsheet File Import (Excel / CSV) and
 * Monthly Multi-KPI Batch Entry Auto-population feature.
 *
 * Checks:
 *  1. CSV parsing with standard headers (KPI Name, Actual Value, Year, Month, Notes)
 *  2. Flexible column alias matching (Indicator, Measured Value, Reporting Month, etc.)
 *  3. Excel (.xlsx) binary parsing using real workbook buffer
 *  4. Robust diagnostic breakdown:
 *     - Matched KPIs
 *     - Unmatched / unrecognized KPI names
 *     - Invalid values (negative numbers, text)
 *     - Empty / missing values
 *     - Duplicate KPI rows in spreadsheet
 *  5. Reporting period detection and conflict identification
 *  6. End-to-end simulation:
 *     - Upload file -> auto-populate batch rows -> manual officer correction -> batch submit
 *     - Backend DB persistence verification
 *     - Performance scoring engine verification (DepartmentScore updated)
 *  7. Clean teardown of temporary test entries
 */

import { sequelize } from '../config/database.js';
import { Department, KPI, User, PerformanceEntry, DepartmentScore } from '../models/index.js';
import { computeAndSaveDepartmentScore } from '../utils/scoreEngine.js';
import ExcelJS from 'exceljs';

// We import the spreadsheet processor directly to test parser logic
import { processSpreadsheetData, generateSampleCsvTemplate } from '../../../frontend/src/utils/fileImportParser.js';

async function runFileImportBatchFlowTests() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING FILE IMPORT & BATCH AUTO-POPULATION TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  const TEST_YEAR = 2098; // Safe future period for test data
  const TEST_MONTH = 10;
  let testOfficer = null;
  let activeKpis = [];

  try {
    await sequelize.authenticate();
    console.log('  Database connection verified.\n');

    // ── Setup: Find active officer and KPIs ──────────────────────────────────
    testOfficer = await User.findOne({
      where: { role: 'department_officer' },
      include: [{ model: Department, as: 'department' }],
    });

    assert(testOfficer !== null, 'Found department officer user');
    assert(testOfficer.department_id !== null, `Officer assigned to department ID: ${testOfficer.department_id}`);

    activeKpis = await KPI.findAll({
      where: { department_id: testOfficer.department_id, is_active: true },
    });

    assert(activeKpis.length >= 2, `Officer department has ${activeKpis.length} active KPIs for testing`);
    console.log(`  Active KPIs: ${activeKpis.map(k => `"${k.name}"`).join(', ')}`);

    const kpi1 = activeKpis[0];
    const kpi2 = activeKpis[1];
    const kpi3 = activeKpis[2] || activeKpis[0];

    // Clean up any old test data in TEST_YEAR / TEST_MONTH first
    await PerformanceEntry.destroy({
      where: {
        department_id: testOfficer.department_id,
        period_year: TEST_YEAR,
        period_month: TEST_MONTH,
      },
    });
    await DepartmentScore.destroy({
      where: {
        department_id: testOfficer.department_id,
        period_year: TEST_YEAR,
        period_month: TEST_MONTH,
      },
    });

    // ── Test 1: Standard CSV Parsing & Matching ─────────────────────────────
    console.log('\n--- 1. Testing Standard CSV Parsing ---');
    const standardCsvContent = [
      'KPI Name,Actual Value,Year,Month,Notes',
      `"${kpi1.name}",85.5,${TEST_YEAR},${TEST_MONTH},"Regular monthly report"`,
      `"${kpi2.name}",92.0,${TEST_YEAR},${TEST_MONTH},"Field inspection log"`,
    ].join('\n');

    const csvBuffer = Buffer.from(standardCsvContent, 'utf-8');
    const parseResult1 = processSpreadsheetData(csvBuffer, activeKpis, 'monthly_report.csv', csvBuffer.length);

    assert(parseResult1.success === true, 'CSV parsed successfully');
    assert(parseResult1.matched.length === 2, `Matched 2 valid KPIs (got ${parseResult1.matched.length})`);
    assert(parseResult1.matched[0].kpi.id === kpi1.id, `First matched KPI is "${kpi1.name}"`);
    assert(parseResult1.matched[0].actual_value === 85.5, 'First KPI actual value parsed as 85.5');
    assert(parseResult1.matched[0].notes === 'Regular monthly report', 'First KPI notes extracted correctly');
    assert(parseResult1.detectedPeriod.year === TEST_YEAR, `Detected year is ${TEST_YEAR}`);
    assert(parseResult1.detectedPeriod.month === TEST_MONTH, `Detected month is ${TEST_MONTH}`);

    // ── Test 2: Flexible Column Aliases & Name Variations ───────────────────
    console.log('\n--- 2. Testing Column Name Aliases & Variations ---');
    const aliasCsvContent = [
      'Indicator,Measured Value,Reporting Year,Reporting Month,Remarks',
      `"${kpi1.name.toLowerCase()}",78.2,${TEST_YEAR},${TEST_MONTH},"Alias test"`,
      `"${kpi2.name.toUpperCase()}",64.0,${TEST_YEAR},${TEST_MONTH},"Case insensitivity test"`,
    ].join('\n');

    const aliasBuffer = Buffer.from(aliasCsvContent, 'utf-8');
    const parseResult2 = processSpreadsheetData(aliasBuffer, activeKpis, 'alias_test.csv', aliasBuffer.length);

    assert(parseResult2.matched.length === 2, 'Matched rows using alias headers (Indicator, Measured Value, etc.)');
    assert(parseResult2.matched[0].actual_value === 78.2, 'Extracted measured value with alias header');
    assert(parseResult2.matched[1].actual_value === 64.0, 'Handled case-insensitive KPI name matching');

    // ── Test 3: Excel (.xlsx) Binary Parsing ────────────────────────────────
    console.log('\n--- 3. Testing Excel (.xlsx) Binary Parsing ---');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('KPI Monthly Data');
    sheet.columns = [
      { header: 'KPI Name', key: 'kpi', width: 35 },
      { header: 'Actual Value', key: 'val', width: 15 },
      { header: 'Year', key: 'yr', width: 10 },
      { header: 'Month', key: 'mo', width: 10 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];
    sheet.addRow({ kpi: kpi1.name, val: 95.0, yr: TEST_YEAR, mo: TEST_MONTH, notes: 'From Excel workbook' });
    sheet.addRow({ kpi: kpi2.name, val: 88.5, yr: TEST_YEAR, mo: TEST_MONTH, notes: 'Automated measurement' });

    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    const parseResultXlsx = processSpreadsheetData(xlsxBuffer, activeKpis, 'kpi_report.xlsx', xlsxBuffer.byteLength);

    assert(parseResultXlsx.success === true, 'Excel (.xlsx) buffer parsed successfully');
    assert(parseResultXlsx.matched.length === 2, `Matched 2 KPIs from Excel file (got ${parseResultXlsx.matched.length})`);
    assert(parseResultXlsx.matched[0].actual_value === 95.0, 'Extracted numeric value 95.0 from Excel cell');
    assert(parseResultXlsx.matched[0].notes === 'From Excel workbook', 'Extracted notes from Excel row');

    // ── Test 4: Diagnostic Breakdown (Unmatched, Invalid, Empty, Duplicates) ─
    console.log('\n--- 4. Testing Diagnostics: Invalid Values, Unmatched KPIs & Duplicates ---');
    const diagnosticCsv = [
      'KPI Name,Actual Value,Year,Month,Notes',
      `"${kpi1.name}",50,${TEST_YEAR},${TEST_MONTH},"Valid row 1"`,
      `"Totally Unknown Mysterious Indicator",100,${TEST_YEAR},${TEST_MONTH},"Should be unmatched"`,
      `"${kpi2.name}",-25,${TEST_YEAR},${TEST_MONTH},"Negative value should be flagged"`,
      `"${kpi2.name}",not_a_number,${TEST_YEAR},${TEST_MONTH},"Text value should be flagged"`,
      `"${kpi3.name}",,${TEST_YEAR},${TEST_MONTH},"Empty value should be flagged"`,
      `"${kpi1.name}",60,${TEST_YEAR},${TEST_MONTH},"Duplicate row for KPI 1"`,
    ].join('\n');

    const diagBuffer = Buffer.from(diagnosticCsv, 'utf-8');
    const parseResultDiag = processSpreadsheetData(diagBuffer, activeKpis, 'diagnostic_test.csv', diagBuffer.length);

    assert(parseResultDiag.matched.length === 2, `Matched valid rows (got ${parseResultDiag.matched.length})`);
    assert(parseResultDiag.unmatched.length === 1, `Identified 1 unmatched KPI (got ${parseResultDiag.unmatched.length})`);
    assert(
      parseResultDiag.unmatched[0].rawKpiName.includes('Totally Unknown'),
      'Unmatched report contains the unknown KPI name'
    );
    assert(parseResultDiag.invalidValues.length === 2, `Identified 2 invalid values (got ${parseResultDiag.invalidValues.length})`);
    assert(
      parseResultDiag.invalidValues.some(iv => iv.reason.includes('Negative')),
      'Detected negative number rejection'
    );
    assert(
      parseResultDiag.invalidValues.some(iv => iv.reason.includes('valid number')),
      'Detected non-numeric rejection'
    );
    assert(parseResultDiag.missingValues.length === 1, `Identified 1 missing value (got ${parseResultDiag.missingValues.length})`);
    assert(parseResultDiag.duplicates.length === 2, `Identified 2 duplicate entries (got ${parseResultDiag.duplicates.length})`);

    // ── Test 5: Reporting Period Conflict Detection ─────────────────────────
    console.log('\n--- 5. Testing Period Detection & Conflict Logic ---');
    const FILE_YEAR = 2027;
    const FILE_MONTH = 6;
    const periodCsv = [
      'KPI,Actual,Year,Month',
      `"${kpi1.name}",70,${FILE_YEAR},June`,
    ].join('\n');
    const periodBuffer = Buffer.from(periodCsv, 'utf-8');
    const parseResultPeriod = processSpreadsheetData(periodBuffer, activeKpis, 'period_test.csv', periodBuffer.length);

    assert(parseResultPeriod.detectedPeriod !== null, 'Detected period metadata');
    assert(parseResultPeriod.detectedPeriod.year === FILE_YEAR, `Detected year 2027`);
    assert(parseResultPeriod.detectedPeriod.month === FILE_MONTH, `Parsed month name "June" -> 6`);

    // Simulate conflict check against form state
    const currentFormYear = 2026;
    const currentFormMonth = 10;
    const hasConflict = (
      parseResultPeriod.detectedPeriod &&
      (parseResultPeriod.detectedPeriod.year !== currentFormYear || parseResultPeriod.detectedPeriod.month !== currentFormMonth)
    );
    assert(hasConflict === true, 'Period conflict correctly flagged when file period differs from form selection');

    // ── Test 6: Template Generator ──────────────────────────────────────────
    console.log('\n--- 6. Testing CSV Template Generator ---');
    const templateOutput = generateSampleCsvTemplate(activeKpis, TEST_YEAR, TEST_MONTH);
    assert(typeof templateOutput === 'string' && templateOutput.length > 0, 'Generated CSV template string');
    assert(templateOutput.startsWith('KPI Name,Actual Value,Year,Month,Notes'), 'Template has correct header row');
    assert(templateOutput.includes(kpi1.name), 'Template includes department KPI names');

    // ── Test 7: End-to-End Simulation: File -> Form -> Manual Edit -> Submit ───
    console.log('\n--- 7. End-to-End Simulation: Populate -> Manual Edit -> Submit & Score ---');

    // Step A: Parse file
    const simulationFile = [
      'KPI Name,Actual Value,Year,Month,Notes',
      `"${kpi1.name}",40.0,${TEST_YEAR},${TEST_MONTH},"Imported from department telemetry"`,
      `"${kpi2.name}",70.0,${TEST_YEAR},${TEST_MONTH},"Imported from department telemetry"`,
    ].join('\n');
    const simBuffer = Buffer.from(simulationFile, 'utf-8');
    const simResult = processSpreadsheetData(simBuffer, activeKpis, 'telemetry.csv', simBuffer.length);

    // Step B: Simulate table population
    const batchRows = {};
    activeKpis.forEach(k => {
      batchRows[k.id] = { actual_value: '', notes: '', status: 'submitted' };
    });
    simResult.matched.forEach(m => {
      batchRows[m.kpi.id] = {
        actual_value: m.actual_value,
        notes: m.notes,
        status: 'submitted',
        isImported: true,
      };
    });

    assert(batchRows[kpi1.id].actual_value === 40.0, 'Batch table row 1 populated with imported value');
    assert(batchRows[kpi2.id].actual_value === 70.0, 'Batch table row 2 populated with imported value');
    assert(batchRows[kpi1.id].isImported === true, 'Import badge flag is set on populated row');

    // Step C: Officer manually corrects KPI 1 value in table before submitting (e.g. 40.0 -> 55.0)
    batchRows[kpi1.id].actual_value = 55.0;
    batchRows[kpi1.id].notes = 'Corrected by officer: revised telemetry calculation';

    assert(batchRows[kpi1.id].actual_value === 55.0, 'Officer manual correction successfully updated table row');

    // Step D: Batch Submit to Backend DB
    for (const kpi of [kpi1, kpi2]) {
      const row = batchRows[kpi.id];
      await PerformanceEntry.create({
        department_id: testOfficer.department_id,
        kpi_id: kpi.id,
        submitted_by: testOfficer.id,
        period_year: TEST_YEAR,
        period_month: TEST_MONTH,
        actual_value: row.actual_value,
        notes: row.notes,
        status: row.status,
      });
    }

    // Verify records saved in database
    const savedEntries = await PerformanceEntry.findAll({
      where: {
        department_id: testOfficer.department_id,
        period_year: TEST_YEAR,
        period_month: TEST_MONTH,
      },
    });

    assert(savedEntries.length === 2, `Database has 2 persisted entries for ${TEST_YEAR}-${TEST_MONTH}`);

    const savedKpi1 = savedEntries.find(e => e.kpi_id === kpi1.id);
    assert(savedKpi1 !== undefined, `Found persisted entry for ${kpi1.name}`);
    assert(
      Number(savedKpi1.actual_value) === 55.0,
      `Persisted entry has officer-corrected value (55.0, got ${savedKpi1.actual_value})`
    );
    assert(
      savedKpi1.notes.includes('revised telemetry'),
      'Persisted entry has updated officer notes'
    );

    // Step E: Verify performance scoring engine computes and saves DepartmentScore
    const scoreResult = await computeAndSaveDepartmentScore(testOfficer.department_id, TEST_YEAR, TEST_MONTH);
    assert(scoreResult.record !== null, 'Department score calculated and persisted');
    assert(
      typeof scoreResult.result.overall_score === 'number' && scoreResult.result.overall_score > 0,
      `Calculated valid department score: ${scoreResult.result.overall_score.toFixed(2)}%`
    );

    const savedScoreRecord = await DepartmentScore.findOne({
      where: {
        department_id: testOfficer.department_id,
        period_year: TEST_YEAR,
        period_month: TEST_MONTH,
      },
    });
    assert(savedScoreRecord !== null, 'DepartmentScore record verified in database');
    assert(
      Number(savedScoreRecord.overall_score) === Number(scoreResult.result.overall_score.toFixed(2)),
      `DepartmentScore in DB matches calculation (${savedScoreRecord.overall_score})`
    );

    // ── Teardown: Clean up test data ────────────────────────────────────────
    console.log('\n--- Cleaning up test artifacts ---');
    await PerformanceEntry.destroy({
      where: {
        department_id: testOfficer.department_id,
        period_year: TEST_YEAR,
        period_month: TEST_MONTH,
      },
    });
    await DepartmentScore.destroy({
      where: {
        department_id: testOfficer.department_id,
        period_year: TEST_YEAR,
        period_month: TEST_MONTH,
      },
    });
    console.log('  Cleaned up temporary entries for safe testing.');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    console.log('\n===============================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('===============================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runFileImportBatchFlowTests();
