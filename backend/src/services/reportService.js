// services/reportService.js
// Generates PDF and Excel performance reports for a department and month.

import { Department, KPI, PerformanceEntry } from '../models/index.js';
import { computeDepartmentScore, getDepartmentRankings } from '../utils/scoreEngine.js';
import { forecastKpi } from '../utils/forecastingEngine.js'; // helper to fetch forecast if exists
import { detectAnomaliesForDepartment } from '../utils/anomalyDetector.js';
import PDFDocument from 'pdfkit'; // pdfkit will be added as a dependency
import ExcelJS from 'exceljs';

/**
 * Assemble the raw data needed for the report.
 * Returns an object containing department info, KPI breakdown, overall score, ranking (if applicable),
 * anomalies, and any experimental forecasts.
 */
export const buildReportData = async (departmentId, year, month) => {
  // 1️⃣ Load department
  const department = await Department.findByPk(departmentId);
  if (!department) throw new Error('Department not found');

  // 2️⃣ Compute score (this re‑uses Stage 7 logic exactly)
  const scoreResult = await computeDepartmentScore(departmentId, year, month);

  // 3️⃣ Get ranking info (only if department is rank‑eligible)
  let ranking = null;
  if (scoreResult.data_status === 'complete') {
    const rankings = await getDepartmentRankings(year, month);
    const found = rankings.ranked_departments.find((r) => r.department_id === departmentId);
    if (found) ranking = found.rank;
  }

  // 4️⃣ Fetch forecasts for each KPI (experimental only)
  const forecasts = {};
  for (const kpi of scoreResult.kpi_breakdown) {
    if (kpi.kpi_id) {
      // Use forecastingEngine helper – we assume a function that returns forecast object or null
      const forecast = await forecastKpi(kpi.kpi_id, year, month);
      if (forecast && forecast.status === 'OPTIMAL') {
        forecasts[kpi.kpi_id] = {
          value: forecast.forecasts[0], // one‑step ahead for the same period (experimental)
          ciLow: forecast.forecasts[0] - 1.96 * forecast.residualStdDev,
          ciHigh: forecast.forecasts[0] + 1.96 * forecast.residualStdDev,
          isExperimental: true,
        };
      }
    }
  }

  // 5️⃣ Run anomaly detection (Stage 9) – returns an array of warning strings
  const anomalies = await detectAnomaliesForDepartment(departmentId, year, month);

  return {
    department,
    period: `${year}-${String(month).padStart(2, '0')}`,
    scoreResult,
    ranking,
    forecasts,
    anomalies,
  };
};

/** Helper to render PDF using pdfkit */
const renderPdf = (report) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  const buffers = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  // Header
  doc.fontSize(20).text('Department Performance Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Department: ${report.department.name} (${report.department.code})`);
  doc.text(`Reporting period: ${report.period}`);
  if (report.ranking) doc.text(`Ranking: ${report.ranking}`);
  doc.moveDown();

  // Table header
  const tableTop = doc.y;
  const colWidths = [90, 70, 60, 60, 70, 70, 70]; // name, target, actual, weight, norm, contrib, forecast
  const headers = ['KPI', 'Target', 'Actual', 'Weight', 'Norm Score', 'Weighted Contrib', 'Forecast'];
  let x = doc.x;
  headers.forEach((h, i) => {
    doc.font('Helvetica-Bold').text(h, x, tableTop, { width: colWidths[i], align: 'center' });
    x += colWidths[i];
  });
  doc.moveDown();

  // Rows
  report.scoreResult.kpi_breakdown.forEach((k) => {
    const rowY = doc.y;
    x = doc.x;
    const actualDisplay = k.actual_value !== null ? k.actual_value : '—';
    const normDisplay = k.normalized_kpi_score !== null ? k.normalized_kpi_score.toFixed(2) : '—';
    const contribDisplay = k.weighted_contribution !== null ? k.weighted_contribution.toFixed(2) : '—';
    const forecastInfo = report.forecasts[k.kpi_id];
    const forecastDisplay = forecastInfo
      ? `${forecastInfo.value.toFixed(2)} (CI ${forecastInfo.ciLow.toFixed(2)}‑${forecastInfo.ciHigh.toFixed(2)})`
      : '—';

    const fill = k.status && k.status.startsWith('MISSING') ? '#f0f0f0' : undefined;
    if (fill) doc.rect(x - 2, rowY - 2, colWidths.reduce((a, b) => a + b, 0) + 2, 20).fill(fill).fillOpacity(0.5).stroke();
    doc.fillColor('black');
    const cells = [k.kpi_name, k.target_value, actualDisplay, `${k.weight}%`, normDisplay, contribDisplay, forecastDisplay];
    cells.forEach((c, i) => {
      doc.text(c, x, rowY, { width: colWidths[i], align: 'center' });
      x += colWidths[i];
    });
    doc.moveDown();
  });

  // Overall score
  doc.moveDown();
  doc.fontSize(14).text(`Overall Score: ${report.scoreResult.overall_score !== null ? report.scoreResult.overall_score.toFixed(2) : 'N/A'}`);
  if (report.anomalies && report.anomalies.length) {
    doc.moveDown();
    doc.fontSize(12).fillColor('red').text('Data‑Quality Warnings');
    report.anomalies.forEach((a) => doc.text(`- ${a}`));
  }

  doc.end();
  return Buffer.concat(buffers);
};

/** Helper to render Excel using exceljs */
const renderExcel = async (report) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report');

  ws.addRow(['Department Performance Report']).font = { size: 16, bold: true };
  ws.addRow([]);
  ws.addRow(['Department', `${report.department.name} (${report.department.code})`]);
  ws.addRow(['Reporting period', report.period]);
  if (report.ranking) ws.addRow(['Ranking', report.ranking]);
  ws.addRow([]);

  // Header row
  ws.addRow(['KPI', 'Target', 'Actual', 'Weight', 'Norm Score', 'Weighted Contrib', 'Forecast']).font = { bold: true };

  // Data rows
  report.scoreResult.kpi_breakdown.forEach((k) => {
    const forecastInfo = report.forecasts[k.kpi_id];
    const forecastCell = forecastInfo
      ? `${forecastInfo.value.toFixed(2)} (CI ${forecastInfo.ciLow.toFixed(2)}‑${forecastInfo.ciHigh.toFixed(2)})`
      : '';
    const row = ws.addRow([
      k.kpi_name,
      k.target_value,
      k.actual_value ?? null,
      k.weight,
      k.normalized_kpi_score ?? null,
      k.weighted_contribution ?? null,
      forecastCell,
    ]);
    if (k.status && k.status.startsWith('MISSING')) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    }
  });

  ws.addRow([]);
  ws.addRow(['Overall Score', report.scoreResult.overall_score ?? null]);

  if (report.anomalies && report.anomalies.length) {
    ws.addRow([]);
    ws.addRow(['Data‑Quality Warnings']).font = { bold: true, color: { argb: 'FFFF0000' } };
    report.anomalies.forEach((a) => ws.addRow([a]));
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

/** Public API – generate report and return binary buffer */
export const generateReport = async (departmentId, year, month, format = 'pdf') => {
  const data = await buildReportData(departmentId, year, month);
  if (format === 'excel') {
    const buf = await renderExcel(data);
    return { buffer: buf, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' };
  }
  // default pdf
  const buf = renderPdf(data);
  return { buffer: buf, mime: 'application/pdf', ext: 'pdf' };
};
