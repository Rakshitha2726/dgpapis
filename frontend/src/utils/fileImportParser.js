/**
 * utils/fileImportParser.js
 * -------------------------
 * Client-side parser for Excel (.xlsx, .xls) and CSV (.csv) batch performance data.
 * Matches spreadsheet rows against active department KPIs with intelligent
 * column header aliasing, fuzzy normalization, validation, and period detection.
 */

import * as XLSX from 'xlsx';

const MONTH_NAME_MAP = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Normalizes a string for robust fuzzy comparison (lowercase, alphanumeric only).
 */
export const normalizeString = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Parse an Excel or CSV file buffer into structured KPI records.
 *
 * @param {File} file - Browser File object
 * @param {Array<Object>} activeKpis - List of active KPIs for officer's department
 * @returns {Promise<Object>} Import report with matched, unmatched, invalid, and period metadata
 */
/**
 * Core spreadsheet processor that operates on binary array data.
 */
export const processSpreadsheetData = (data, activeKpis = [], fileName = 'imported_file', fileSize = 0) => {
  const workbook = XLSX.read(data, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded spreadsheet contains no sheets or readable data.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The spreadsheet is empty. Please add KPI records and try again.');
  }

  // Build lookup map for active KPIs
  const kpiLookup = new Map();
  activeKpis.forEach((kpi) => {
    kpiLookup.set(normalizeString(kpi.name), kpi);
    kpiLookup.set(String(kpi.id), kpi);
    if (kpi.code) {
      kpiLookup.set(normalizeString(kpi.code), kpi);
    }
  });

  const matched = [];
  const unmatched = [];
  const invalidValues = [];
  const missingValues = [];
  const duplicates = [];

  let detectedYear = null;
  let detectedMonth = null;
  const seenKpiIds = new Set();

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 for 0-index, +1 for header row

    // Resolve column values with flexible aliases
    let rawKpi = '';
    let rawValue = '';
    let rawYear = '';
    let rawMonth = '';
    let rawNotes = '';

    for (const [key, val] of Object.entries(row)) {
      const cleanKey = normalizeString(key);

      // KPI Identifier
      if (['kpiname', 'kpi', 'indicator', 'metric', 'metricname', 'name', 'kpiid', 'id'].includes(cleanKey)) {
        if (!rawKpi && val !== undefined && val !== '') rawKpi = String(val).trim();
      }
      // Actual Value
      else if (['actualvalue', 'actual', 'measuredvalue', 'measured', 'value', 'reading', 'score', 'result'].includes(cleanKey)) {
        if (rawValue === '' && val !== undefined && val !== '') rawValue = String(val).trim();
      }
      // Period Year
      else if (['year', 'reportingyear', 'periodyear', 'yr'].includes(cleanKey)) {
        if (!rawYear && val !== undefined && val !== '') rawYear = String(val).trim();
      }
      // Period Month
      else if (['month', 'reportingmonth', 'periodmonth', 'mo'].includes(cleanKey)) {
        if (!rawMonth && val !== undefined && val !== '') rawMonth = String(val).trim();
      }
      // Notes
      else if (['notes', 'note', 'remarks', 'remark', 'comments', 'comment', 'justification', 'source'].includes(cleanKey)) {
        if (!rawNotes && val !== undefined && val !== '') rawNotes = String(val).trim();
      }
    }

    // Skip completely empty spacer rows
    if (!rawKpi && rawValue === '' && !rawYear && !rawMonth) {
      return;
    }

    // Period extraction from row if not yet established
    if (!detectedYear && rawYear) {
      const parsedY = parseInt(rawYear, 10);
      if (!isNaN(parsedY) && parsedY >= 2000 && parsedY <= 2100) {
        detectedYear = parsedY;
      }
    }

    if (!detectedMonth && rawMonth) {
      let parsedM = parseInt(rawMonth, 10);
      if (isNaN(parsedM)) {
        const cleanM = String(rawMonth).toLowerCase().trim();
        parsedM = MONTH_NAME_MAP[cleanM] || null;
      }
      if (parsedM && parsedM >= 1 && parsedM <= 12) {
        detectedMonth = parsedM;
      }
    }

    // KPI Matching
    const normKpi = normalizeString(rawKpi);
    const matchedKpi = kpiLookup.get(normKpi) || kpiLookup.get(rawKpi);

    if (!matchedKpi) {
      unmatched.push({
        rowNumber,
        rawKpiName: rawKpi || '(Empty KPI Name)',
        rawValue,
        rawNotes,
      });
      return;
    }

    // Duplicate detection in file
    if (seenKpiIds.has(matchedKpi.id)) {
      duplicates.push({
        rowNumber,
        kpiId: matchedKpi.id,
        kpiName: matchedKpi.name,
        rawValue,
      });
    }
    seenKpiIds.add(matchedKpi.id);

    // Value Validation
    if (rawValue === '') {
      missingValues.push({
        rowNumber,
        kpiId: matchedKpi.id,
        kpiName: matchedKpi.name,
      });
      return;
    }

    const numVal = parseFloat(rawValue);
    if (isNaN(numVal) || numVal < 0) {
      invalidValues.push({
        rowNumber,
        kpiId: matchedKpi.id,
        kpiName: matchedKpi.name,
        rawValue,
        reason: isNaN(numVal) ? 'Not a valid number' : 'Negative values are not permitted',
      });
      return;
    }

    // Matched & Validated
    matched.push({
      rowNumber,
      kpi: matchedKpi,
      actual_value: numVal,
      notes: rawNotes || null,
    });
  });

  return {
    success: true,
    fileName,
    fileSize,
    totalRows: rawRows.length,
    matched,
    unmatched,
    invalidValues,
    missingValues,
    duplicates,
    detectedPeriod: (detectedYear || detectedMonth) ? {
      year: detectedYear,
      month: detectedMonth,
    } : null,
  };
};

/**
 * Parse an Excel or CSV file buffer/blob into structured KPI records.
 *
 * @param {File|Blob|ArrayBuffer|Uint8Array} file - File object or binary buffer
 * @param {Array<Object>} activeKpis - List of active KPIs for officer's department
 * @returns {Promise<Object>} Import report with matched, unmatched, invalid, and period metadata
 */
export const parseKpiSpreadsheet = async (file, activeKpis = []) => {
  const fileName = file?.name || 'spreadsheet_upload';
  const fileSize = file?.size || 0;

  // Direct binary / ArrayBuffer support (Node.js or direct buffer)
  if (file instanceof Uint8Array || file instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(file))) {
    const uint8 = file instanceof Uint8Array ? file : new Uint8Array(file);
    return processSpreadsheetData(uint8, activeKpis, fileName, fileSize);
  }

  // Modern browser or modern Node Blob / File (.arrayBuffer() promise)
  if (typeof file?.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    return processSpreadsheetData(new Uint8Array(buffer), activeKpis, fileName, fileSize);
  }

  // Fallback to FileReader if available
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reject(new Error('Failed to read the selected file. Please ensure the file is readable and try again.'));
      };
      reader.onload = (e) => {
        try {
          const result = processSpreadsheetData(new Uint8Array(e.target.result), activeKpis, fileName, fileSize);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  throw new Error('Unsupported file input type or environment.');
};

/**
 * Generate a downloadable sample CSV template for the department's active KPIs.
 */
export const generateSampleCsvTemplate = (activeKpis = [], year = new Date().getFullYear(), month = new Date().getMonth() + 1) => {
  const headers = ['KPI Name', 'Actual Value', 'Year', 'Month', 'Notes'];
  const rows = activeKpis.map((kpi) => [
    `"${kpi.name}"`,
    kpi.target_value ? Number(kpi.target_value) : '',
    year,
    month,
    `"Monthly measured actual for ${kpi.unit}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
};
