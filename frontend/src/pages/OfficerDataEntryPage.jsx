import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import performanceService from '../services/performanceService';
import PerformanceEntryModal from '../components/PerformanceEntryModal';
import { parseKpiSpreadsheet, generateSampleCsvTemplate } from '../utils/fileImportParser';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const OfficerDataEntryPage = () => {
  const { user } = useAuth();
  const [activeKpis, setActiveKpis] = useState([]);
  const [departmentInfo, setDepartmentInfo] = useState(null);
  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Mode: 'history' (individual entry modal + list) or 'batch' (multi-KPI table)
  const [entryMode, setEntryMode] = useState('history');

  // Filters for History view
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedKpiId, setSelectedKpiId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Batch Entry State
  const now = new Date();
  const [batchYear, setBatchYear] = useState(now.getFullYear());
  const [batchMonth, setBatchMonth] = useState(now.getMonth() + 1);
  const [batchRows, setBatchRows] = useState({});
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);

  // File Import State
  const fileInputRef = useRef(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [periodConflict, setPeriodConflict] = useState(null);
  const [showImportDetails, setShowImportDetails] = useState(false);

  const loadActiveKpis = async () => {
    try {
      const data = await performanceService.getActiveKpis();
      setActiveKpis(data.kpis || []);
      setDepartmentInfo(data.department || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load active KPIs for your department.');
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedYear) params.period_year = selectedYear;
      if (selectedMonth) params.period_month = selectedMonth;
      if (selectedKpiId) params.kpi_id = selectedKpiId;
      if (selectedStatus) params.status = selectedStatus;

      const data = await performanceService.getEntries(params);
      setEntries(data.entries || []);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load performance entries.');
      setLoading(false);
    }
  };

  const loadBatchPeriodData = useCallback(async (year, month) => {
    setBatchLoading(true);
    try {
      const data = await performanceService.getEntries({
        period_year: year,
        period_month: month,
      });
      const entriesMap = {};
      (data.entries || []).forEach((e) => {
        entriesMap[e.kpi_id] = e;
      });

      const initialRows = {};
      activeKpis.forEach((k) => {
        const existing = entriesMap[k.id];
        initialRows[k.id] = {
          actual_value: existing ? (existing.actual_value !== null ? existing.actual_value : '') : '',
          notes: existing?.notes || '',
          status: existing?.status || 'submitted',
          existing_id: existing?.id || null,
        };
      });
      setBatchRows(initialRows);
    } catch (err) {
      console.error('Failed to load batch period data', err);
    } finally {
      setBatchLoading(false);
    }
  }, [activeKpis]);

  useEffect(() => {
    loadActiveKpis();
  }, []);

  useEffect(() => {
    loadEntries();
  }, [selectedYear, selectedMonth, selectedKpiId, selectedStatus]);

  useEffect(() => {
    if (entryMode === 'batch' && activeKpis.length > 0) {
      loadBatchPeriodData(batchYear, batchMonth);
    }
  }, [entryMode, batchYear, batchMonth, activeKpis, loadBatchPeriodData]);

  const showNotification = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const handleBatchInputChange = (kpiId, field, value) => {
    setBatchRows((prev) => ({
      ...prev,
      [kpiId]: {
        ...(prev[kpiId] || { actual_value: '', notes: '', status: 'submitted', existing_id: null }),
        [field]: value,
      },
    }));
  };

  const applyImportedValues = (matchedList) => {
    setBatchRows((prev) => {
      const next = { ...prev };
      matchedList.forEach((m) => {
        next[m.kpi.id] = {
          actual_value: m.actual_value,
          notes: m.notes || next[m.kpi.id]?.notes || '',
          status: 'submitted',
          existing_id: next[m.kpi.id]?.existing_id || null,
          isImported: true,
        };
      });
      return next;
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportError(null);
    setPeriodConflict(null);

    try {
      const result = await parseKpiSpreadsheet(file, activeKpis);
      setImportResult(result);

      // Check if file specifies a period that differs from current view
      if (
        result.detectedPeriod &&
        result.detectedPeriod.year &&
        result.detectedPeriod.month &&
        (result.detectedPeriod.year !== batchYear || result.detectedPeriod.month !== batchMonth)
      ) {
        setPeriodConflict(result.detectedPeriod);
      } else {
        // Automatically populate table with matched values
        applyImportedValues(result.matched);
      }

      showNotification(
        `Parsed "${file.name}": ${result.matched.length} KPI(s) matched. Review values before submitting.`
      );
    } catch (err) {
      setImportError(err.message || 'Failed to parse spreadsheet file.');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmPeriodSwitch = async () => {
    if (!periodConflict) return;
    const { year, month } = periodConflict;
    setBatchYear(year);
    setBatchMonth(month);
    setPeriodConflict(null);

    setBatchLoading(true);
    try {
      const data = await performanceService.getEntries({
        period_year: year,
        period_month: month,
      });
      const entriesMap = {};
      (data.entries || []).forEach((e) => {
        entriesMap[e.kpi_id] = e;
      });

      const updatedRows = {};
      activeKpis.forEach((k) => {
        const existing = entriesMap[k.id];
        updatedRows[k.id] = {
          actual_value: existing ? (existing.actual_value !== null ? existing.actual_value : '') : '',
          notes: existing?.notes || '',
          status: existing?.status || 'submitted',
          existing_id: existing?.id || null,
        };
      });

      // Apply imported file values
      if (importResult?.matched) {
        importResult.matched.forEach((m) => {
          updatedRows[m.kpi.id] = {
            ...updatedRows[m.kpi.id],
            actual_value: m.actual_value,
            notes: m.notes || updatedRows[m.kpi.id]?.notes || '',
            status: 'submitted',
            isImported: true,
          };
        });
      }

      setBatchRows(updatedRows);
      showNotification(`Switched view to ${MONTH_NAMES[month - 1]} ${year} and populated imported KPI measurements.`);
    } catch (err) {
      console.error('Failed to load period data on switch:', err);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleKeepCurrentPeriod = () => {
    if (importResult?.matched) {
      applyImportedValues(importResult.matched);
      showNotification(`Populated ${importResult.matched.length} KPI values into current period (${MONTH_NAMES[batchMonth - 1]} ${batchYear}).`);
    }
    setPeriodConflict(null);
  };

  const handleClearImport = () => {
    setImportResult(null);
    setImportError(null);
    setPeriodConflict(null);
    loadBatchPeriodData(batchYear, batchMonth);
    showNotification('Cleared imported file data and restored current table values.');
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateSampleCsvTemplate(activeKpis, batchYear, batchMonth);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const deptCode = departmentInfo?.code || 'Department';
    link.href = url;
    link.setAttribute('download', `${deptCode}_KPI_Template_${batchYear}_${String(batchMonth).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveBatch = async (forceStatus = null) => {
    setError(null);
    setBatchSaving(true);
    let savedCount = 0;
    let failedCount = 0;
    let lastError = null;

    try {
      for (const kpi of activeKpis) {
        const row = batchRows[kpi.id];
        if (!row || row.actual_value === '' || row.actual_value === null || row.actual_value === undefined) {
          continue; // skip untouched KPIs
        }

        const numVal = parseFloat(row.actual_value);
        if (isNaN(numVal) || numVal < 0) {
          setError(`Invalid value for "${kpi.name}". Value must be a non-negative number.`);
          setBatchSaving(false);
          return;
        }

        const targetStatus = forceStatus || row.status || 'submitted';

        try {
          if (row.existing_id) {
            await performanceService.updateEntry(row.existing_id, {
              actual_value: numVal,
              notes: row.notes?.trim() || null,
              status: targetStatus,
            });
          } else {
            await performanceService.createEntry({
              kpi_id: kpi.id,
              period_year: Number(batchYear),
              period_month: Number(batchMonth),
              actual_value: numVal,
              notes: row.notes?.trim() || null,
              status: targetStatus,
            });
          }
          savedCount++;
        } catch (itemErr) {
          failedCount++;
          lastError = itemErr.response?.data?.message || itemErr.message;
        }
      }

      if (savedCount === 0 && failedCount === 0) {
        setError('No KPI values entered. Please fill in measured values before saving.');
      } else if (failedCount > 0) {
        setError(`Saved ${savedCount} KPI(s), but ${failedCount} failed: ${lastError}`);
      } else {
        const actionLabel = forceStatus === 'draft' ? 'saved as draft' : 'submitted';
        showNotification(
          `Successfully ${actionLabel} ${savedCount} KPI entries for ${MONTH_NAMES[batchMonth - 1]} ${batchYear}. Department score updated!`
        );
      }

      await loadBatchPeriodData(batchYear, batchMonth);
      loadEntries();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save batch entries.');
    } finally {
      setBatchSaving(false);
    }
  };

  const handleOpenAddModal = () => {
    setSelectedEntry(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (entry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <main style={styles.container}>
        {/* Department Banner */}
        <div style={styles.deptBanner}>
          <div style={styles.deptBannerContent}>
            <span style={styles.deptIcon}>🏥</span>
            <div>
              <div style={styles.deptCodeTag}>
                {user?.department?.code || departmentInfo?.code || 'DEPT'}
              </div>
              <h1 style={styles.deptTitle}>
                {user?.department?.name || departmentInfo?.name || 'Assigned Department'}
              </h1>
              <p style={styles.deptDesc}>
                Official Performance Metric Data Entry & Monthly Submission Records — Officer: <strong>{user?.name}</strong> ({user?.email})
              </p>
            </div>
          </div>

          <button onClick={handleOpenAddModal} style={styles.addBtn}>
            ➕ Enter Monthly Performance Data
          </button>
        </div>

        {successToast && (
          <div style={styles.successToast}>
            <span>✅</span>
            <div>{successToast}</div>
          </div>
        )}

        {error && (
          <div style={styles.errorAlert}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}
        {/* Mode Switcher Tabs */}
        <div style={styles.modeTabBar}>
          <button
            onClick={() => setEntryMode('history')}
            style={entryMode === 'history' ? styles.modeTabActive : styles.modeTab}
          >
            📋 Entry History &amp; Individual Edit
          </button>
          <button
            onClick={() => setEntryMode('batch')}
            style={entryMode === 'batch' ? styles.modeTabActive : styles.modeTab}
          >
            ⚡ Monthly Multi-KPI Batch Entry
          </button>
        </div>

        {entryMode === 'batch' ? (
          /* ── Batch Entry Mode ────────────────────────────────────────────── */
          <div style={styles.batchCard}>
            <div style={styles.batchHeader}>
              <div style={{ flex: 1 }}>
                <div style={styles.batchTitleRow}>
                  <h3 style={styles.batchTitle}>Monthly Multi-KPI Batch Entry</h3>
                  <div
                    style={styles.excelIconBadge}
                    title="Supported formats: Excel (.xlsx, .xls) and CSV (.csv)"
                  >
                    <span style={{ fontSize: '1.4rem' }}>⊞</span>
                  </div>
                </div>
                <p style={styles.batchSub}>
                  Enter values manually or import a departmental report.
                </p>
              </div>
            </div>

            {/* ── 3 Import Workflow Step Cards (Mockup) ─────────────────────────── */}
            <div style={styles.importStepCardsRow}>
              {/* Card 1: Choose File */}
              <div
                style={{
                  ...styles.importStepCard,
                  borderColor: importResult ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)',
                  background: importResult ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                }}
                onClick={() => fileInputRef.current?.click()}
                title="Click to select an Excel (.xlsx, .xls) or CSV (.csv) file"
              >
                <div style={styles.stepCardIcon}>⭱</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.stepCardTitle}>Choose File</div>
                  <div style={styles.stepCardSub} title={importResult?.fileName}>
                    {importLoading
                      ? 'Reading file...'
                      : importResult
                      ? `📄 ${importResult.fileName}`
                      : 'Excel or CSV'}
                  </div>
                </div>
                {importResult && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearImport();
                    }}
                    style={styles.cardClearBtn}
                    title="Clear imported file and reset"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Card 2: Preview Data */}
              <div
                style={{
                  ...styles.importStepCard,
                  borderColor: importResult
                    ? importResult.unmatched.length > 0 || importResult.invalidValues.length > 0
                      ? '#fbbf24'
                      : '#10b981'
                    : 'rgba(255, 255, 255, 0.08)',
                  background: importResult
                    ? importResult.unmatched.length > 0 || importResult.invalidValues.length > 0
                      ? 'rgba(245, 158, 11, 0.08)'
                      : 'rgba(16, 185, 129, 0.08)'
                    : 'rgba(15, 23, 42, 0.4)',
                  cursor: importResult ? 'pointer' : 'default',
                  opacity: importResult ? 1 : 0.7,
                }}
                onClick={() => {
                  if (importResult) setShowImportDetails(!showImportDetails);
                }}
                title={importResult ? 'Click to inspect matched and unmatched KPI details' : 'Upload a file to preview data'}
              >
                <div style={styles.stepCardIcon}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.stepCardTitle}>Preview Data</div>
                  <div style={styles.stepCardSub}>
                    {importResult
                      ? `${importResult.matched.length} matched · ${importResult.unmatched.length} unmatched`
                      : 'Review matched KPI values'}
                  </div>
                </div>
                {importResult && (
                  <span style={styles.stepCardToggleText}>
                    {showImportDetails ? 'Hide ▲' : 'Details ▼'}
                  </span>
                )}
              </div>

              {/* Card 3: Confirm & Submit */}
              <div
                style={{
                  ...styles.importStepCard,
                  borderColor: Object.values(batchRows).some((r) => r.actual_value !== '') ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                  background: Object.values(batchRows).some((r) => r.actual_value !== '') ? 'rgba(16, 185, 129, 0.06)' : 'rgba(15, 23, 42, 0.4)',
                  opacity: Object.values(batchRows).some((r) => r.actual_value !== '') ? 1 : 0.7,
                }}
              >
                <div style={styles.stepCardIcon}>✅</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.stepCardTitle}>Confirm &amp; Submit</div>
                  <div style={styles.stepCardSub}>
                    {Object.values(batchRows).filter((r) => r.actual_value !== '').length > 0
                      ? `${Object.values(batchRows).filter((r) => r.actual_value !== '').length} KPI(s) ready in table`
                      : 'Validate and calculate scores'}
                  </div>
                </div>
              </div>
            </div>

            {/* Note text below 3 cards as in screenshot */}
            <p style={styles.importNoteText}>
              The imported values populate the existing KPI table. The officer can correct them before submitting.
            </p>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {/* Import Error Alert if any */}
            {importError && (
              <div style={styles.importErrorBox}>
                <span>⚠️</span>
                <div style={{ flex: 1 }}>{importError}</div>
                <button
                  type="button"
                  onClick={() => setImportError(null)}
                  style={styles.closeAlertBtn}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Reporting Period Mismatch Confirmation */}
            {periodConflict && (
              <div style={styles.conflictBanner}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>📅</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#fbbf24' }}>Reporting Period Detected in File:</strong>
                    <p style={{ margin: '0.2rem 0 0.5rem', fontSize: '0.85rem', color: '#e2e8f0' }}>
                      The uploaded file specifies <strong>{MONTH_NAMES[periodConflict.month - 1]} {periodConflict.year}</strong>, but the current batch view is set to <strong>{MONTH_NAMES[batchMonth - 1]} {batchYear}</strong>.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleConfirmPeriodSwitch}
                        style={styles.conflictSwitchBtn}
                      >
                        🔄 Switch Form to {MONTH_NAMES[periodConflict.month - 1]} {periodConflict.year} &amp; Populate
                      </button>
                      <button
                        type="button"
                        onClick={handleKeepCurrentPeriod}
                        style={styles.conflictKeepBtn}
                      >
                        Keep Current View ({MONTH_NAMES[batchMonth - 1]} {batchYear})
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Import Review Breakdown */}
            {importResult && (
              <div style={styles.importSummaryBanner}>
                <div style={styles.summaryStatsRow}>
                  <div style={styles.summaryBadgeGreen}>
                    ✅ <strong>{importResult.matched.length}</strong> Matched
                  </div>
                  {importResult.unmatched.length > 0 && (
                    <div style={styles.summaryBadgeAmber}>
                      ⚠️ <strong>{importResult.unmatched.length}</strong> Unmatched
                    </div>
                  )}
                  {importResult.invalidValues.length > 0 && (
                    <div style={styles.summaryBadgeRed}>
                      🚨 <strong>{importResult.invalidValues.length}</strong> Invalid
                    </div>
                  )}
                  {importResult.missingValues.length > 0 && (
                    <div style={styles.summaryBadgeAmber}>
                      📋 <strong>{importResult.missingValues.length}</strong> Empty
                    </div>
                  )}
                  {importResult.duplicates.length > 0 && (
                    <div style={styles.summaryBadgeAmber}>
                      🔁 <strong>{importResult.duplicates.length}</strong> Duplicate
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowImportDetails(!showImportDetails)}
                    style={styles.detailsToggleBtn}
                  >
                    {showImportDetails ? 'Hide Breakdown ▲' : 'Show Breakdown ▼'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearImport}
                    style={styles.clearImportBtn}
                  >
                    ✕ Clear Import
                  </button>
                </div>

                {showImportDetails && (
                  <div style={styles.importDetailsBox}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '0.88rem' }}>
                      Reconciliation Diagnostic
                    </h5>
                    {importResult.unmatched.length > 0 && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: '700' }}>
                          ⚠️ Unrecognized KPI Rows (Skipped):
                        </span>
                        <ul style={{ margin: '0.2rem 0 0 1.25rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          {importResult.unmatched.map((u, i) => (
                            <li key={i}>
                              Row {u.rowNumber}: <strong>"{u.rawKpiName}"</strong> (Value: {u.rawValue || 'empty'})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {importResult.invalidValues.length > 0 && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: '700' }}>
                          🚨 Invalid Values (Skipped):
                        </span>
                        <ul style={{ margin: '0.2rem 0 0 1.25rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          {importResult.invalidValues.map((iv, i) => (
                            <li key={i}>
                              Row {iv.rowNumber}: KPI <strong>"{iv.kpiName}"</strong> — {iv.reason} ({iv.rawValue})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: '700' }}>
                        ✅ Matched KPI Values Populated in Table:
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {importResult.matched.map((m, i) => (
                          <span key={i} style={styles.matchedPill}>
                            {m.kpi.name}: <strong>{m.actual_value}</strong> {m.kpi.unit}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Period Selectors & Sample Template Download Bar */}
            <div style={styles.periodAndTemplateBar}>
              <div style={styles.batchPeriodRow}>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Reporting Year:</label>
                  <select
                    value={batchYear}
                    onChange={(e) => setBatchYear(Number(e.target.value))}
                    style={styles.selectInput}
                    disabled={batchSaving}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Reporting Month:</label>
                  <select
                    value={batchMonth}
                    onChange={(e) => setBatchMonth(Number(e.target.value))}
                    style={styles.selectInput}
                    disabled={batchSaving}
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{idx + 1} - {m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                style={styles.downloadTemplateBtn}
                title="Download spreadsheet CSV template pre-filled with department KPIs"
              >
                📥 Download CSV Template
              </button>
            </div>

            {batchLoading ? (
              <div style={styles.loadingContainer}>
                <div className="spinner" style={styles.spinner} />
                <p>Loading KPI entries for {MONTH_NAMES[batchMonth - 1]} {batchYear}...</p>
              </div>
            ) : activeKpis.length === 0 ? (
              <div style={styles.emptyContainer}>
                <p style={{ color: '#94a3b8' }}>No active KPIs configured for this department.</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Key Performance Indicator</th>
                        <th style={styles.th}>Target Benchmark</th>
                        <th style={styles.th}>Rule</th>
                        <th style={styles.th}>Actual Measured Value *</th>
                        <th style={styles.th}>Submission Status</th>
                        <th style={styles.th}>Notes / Justification</th>
                        <th style={styles.th}>Current State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeKpis.map((kpi) => {
                        const row = batchRows[kpi.id] || { actual_value: '', notes: '', status: 'submitted', existing_id: null };
                        const hasExisting = !!row.existing_id;
                        return (
                          <tr key={kpi.id} style={styles.tr}>
                            <td style={styles.td}>
                              <strong style={{ color: '#f1f5f9' }}>{kpi.name}</strong>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                                Weight: {kpi.weight}% · {kpi.category || 'General'}
                              </div>
                            </td>

                            <td style={styles.td}>
                              <strong>{Number(kpi.target_value).toFixed(2)}</strong>{' '}
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{kpi.unit}</span>
                            </td>

                            <td style={styles.td}>
                              {kpi.higher_is_better ? (
                                <span style={styles.tagHigher}>Higher ↑</span>
                              ) : (
                                <span style={styles.tagLower}>Lower ↓</span>
                              )}
                            </td>

                            <td style={styles.td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={row.actual_value}
                                  onChange={(e) => handleBatchInputChange(kpi.id, 'actual_value', e.target.value)}
                                  placeholder="0.00"
                                  style={{
                                    ...styles.batchValInput,
                                    borderColor: row.isImported ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)',
                                    background: row.isImported ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.8)',
                                  }}
                                  disabled={batchSaving}
                                />
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{kpi.unit}</span>
                              </div>
                            </td>

                            <td style={styles.td}>
                              <select
                                value={row.status}
                                onChange={(e) => handleBatchInputChange(kpi.id, 'status', e.target.value)}
                                style={styles.batchSelect}
                                disabled={batchSaving}
                              >
                                <option value="submitted">Submitted</option>
                                <option value="draft">Draft</option>
                              </select>
                            </td>

                            <td style={styles.td}>
                              <input
                                type="text"
                                maxLength={1000}
                                value={row.notes}
                                onChange={(e) => handleBatchInputChange(kpi.id, 'notes', e.target.value)}
                                placeholder="Optional notes / source"
                                style={styles.batchNoteInput}
                                disabled={batchSaving}
                              />
                            </td>

                            <td style={styles.td}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                                {row.isImported && (
                                  <span style={styles.statusImported} title="Value populated from uploaded spreadsheet">
                                    📥 From File
                                  </span>
                                )}
                                {hasExisting ? (
                                  row.status === 'submitted' ? (
                                    <span style={styles.statusSubmitted}>● Existing</span>
                                  ) : (
                                    <span style={styles.statusDraft}>○ Draft</span>
                                  )
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>✨ New</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Batch Action Buttons */}
                <div style={styles.batchActionRow}>
                  <button
                    onClick={() => handleSaveBatch('draft')}
                    disabled={batchSaving}
                    style={styles.batchDraftBtn}
                  >
                    💾 Save Entered as Draft
                  </button>
                  <button
                    onClick={() => handleSaveBatch('submitted')}
                    disabled={batchSaving}
                    style={styles.batchSubmitBtn}
                  >
                    {batchSaving ? 'Saving & Calculating...' : '🚀 Submit All & Calculate Score'}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── Individual Entry & History Mode ────────────────────────────── */
          <>
            {/* Filter Bar */}
            <div style={styles.filterCard}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={styles.selectInput}
            >
              <option value="">All Years</option>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={styles.selectInput}
            >
              <option value="">All Months</option>
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>{idx + 1} - {m}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>KPI:</label>
            <select
              value={selectedKpiId}
              onChange={(e) => setSelectedKpiId(e.target.value)}
              style={styles.selectInput}
            >
              <option value="">All Active KPIs</option>
              {activeKpis.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={styles.selectInput}
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Data Records Table */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div className="spinner" style={styles.spinner} />
            <p>Loading Department Performance History...</p>
          </div>
        ) : entries.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
            <h3>No Performance Entries Found</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Click "Enter Monthly Performance Data" above to submit data for your assigned department.
            </p>
          </div>
        ) : (
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Reporting Period</th>
                  <th style={styles.th}>Key Performance Indicator</th>
                  <th style={styles.th}>Target Benchmark</th>
                  <th style={styles.th}>Actual Measured Value</th>
                  <th style={styles.th}>Direction Rule</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Submitted By</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((item) => (
                  <tr key={item.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{item.period_year}-{String(item.period_month).padStart(2, '0')}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {MONTH_NAMES[item.period_month - 1]}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <strong>{item.kpi ? item.kpi.name : `KPI #${item.kpi_id}`}</strong>
                      {item.notes && (
                        <div style={styles.notesText} title={item.notes}>
                          📝 {item.notes.length > 50 ? `${item.notes.substring(0, 50)}...` : item.notes}
                        </div>
                      )}
                    </td>

                    <td style={styles.td}>
                      {item.kpi ? item.kpi.target_value : '-'} <small style={{ color: '#94a3b8' }}>{item.kpi?.unit}</small>
                    </td>

                    <td style={styles.td}>
                      <span style={styles.actualValBadge}>
                        {item.actual_value} <small>{item.kpi?.unit}</small>
                      </span>
                    </td>

                    <td style={styles.td}>
                      {item.kpi?.higher_is_better ? (
                        <span style={styles.tagHigher}>Higher ↑</span>
                      ) : (
                        <span style={styles.tagLower}>Lower ↓</span>
                      )}
                    </td>

                    <td style={styles.td}>
                      {item.status === 'submitted' ? (
                        <span style={styles.statusSubmitted}>● Submitted</span>
                      ) : (
                        <span style={styles.statusDraft}>○ Draft</span>
                      )}
                    </td>

                    <td style={styles.td}>
                      <span style={{ fontSize: '0.82rem' }}>{item.submittedBy?.name || 'Officer'}</span>
                    </td>

                    <td style={styles.td}>
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        style={styles.editBtn}
                        title="Edit Entry"
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )}

    {/* Officer Quick Navigation Row */}
    <div style={styles.officerNavRow}>
      <Link to="/officer" style={styles.officerNavBtn}>🏠 Officer Dashboard</Link>
      <Link to="/officer/score" style={styles.officerNavBtn}>📊 Score Breakdown</Link>
      <Link to="/officer/rankings" style={styles.officerNavBtn}>🏆 Department Rankings</Link>
      <Link to="/officer/forecast" style={styles.officerNavBtn}>🔮 Performance Forecast</Link>
    </div>
  </main>

      {/* Performance Entry Modal */}
      <PerformanceEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entry={selectedEntry}
        activeKpis={activeKpis}
        departmentInfo={departmentInfo}
        onSaveSuccess={() => {
          showNotification(
            selectedEntry
              ? 'Performance record updated successfully.'
              : 'New monthly performance entry submitted successfully.'
          );
          loadEntries();
        }}
      />
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
  },
  container: {
    maxWidth: '1280px',
    margin: '2rem auto',
    padding: '0 1.5rem 3rem 1.5rem',
  },
  deptBanner: {
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '16px',
    padding: '1.75rem 2rem',
    marginBottom: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.25rem',
  },
  deptBannerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  deptIcon: {
    fontSize: '2.5rem',
    background: 'rgba(56, 189, 248, 0.15)',
    padding: '0.75rem',
    borderRadius: '14px',
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  deptCodeTag: {
    display: 'inline-block',
    background: '#0284c7',
    color: '#fff',
    fontWeight: '800',
    fontSize: '0.75rem',
    padding: '0.15rem 0.6rem',
    borderRadius: '6px',
    marginBottom: '0.35rem',
    letterSpacing: '0.5px',
  },
  deptTitle: {
    fontSize: '1.6rem',
    fontWeight: '800',
    margin: '0 0 0.25rem 0',
  },
  deptDesc: {
    color: '#94a3b8',
    margin: 0,
    fontSize: '0.88rem',
  },
  addBtn: {
    padding: '0.8rem 1.35rem',
    background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
  },
  successToast: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#6ee7b7',
    padding: '0.85rem 1.2rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    padding: '0.85rem 1.2rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  filterCard: {
    display: 'flex',
    gap: '1rem',
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '0.85rem 1.25rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filterLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: '600',
  },
  selectInput: {
    background: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    color: '#f8fafc',
    padding: '0.45rem 0.75rem',
    fontSize: '0.85rem',
    outline: 'none',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '4rem 1rem',
    color: '#94a3b8',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#38bdf8',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 1rem',
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '4rem 1rem',
    background: 'rgba(30, 41, 59, 0.4)',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
  },
  tableCard: {
    background: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.9rem',
  },
  th: {
    padding: '1rem',
    background: 'rgba(15, 23, 42, 0.8)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  td: {
    padding: '1rem',
    color: '#cbd5e1',
    verticalAlign: 'middle',
  },
  notesText: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    marginTop: '0.2rem',
    fontStyle: 'italic',
  },
  actualValBadge: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.1)',
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
  },
  tagHigher: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
  },
  tagLower: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.1)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
  },
  statusSubmitted: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.15)',
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
  },
  statusDraft: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.15)',
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
  },
  editBtn: {
    padding: '0.4rem 0.75rem',
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    color: '#38bdf8',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  // Mode tabs
  modeTabBar: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  modeTab: {
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#94a3b8',
    padding: '0.65rem 1.25rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  modeTabActive: {
    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
    border: '1px solid #38bdf8',
    color: '#ffffff',
    padding: '0.65rem 1.25rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
  },
  // Batch Card
  batchCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.75rem',
    marginBottom: '2rem',
  },
  batchHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1.25rem',
    marginBottom: '1.5rem',
    paddingBottom: '1.25rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  batchTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  excelIconBadge: {
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    borderRadius: '8px',
    color: '#10b981',
    flexShrink: 0,
  },
  batchTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 0.35rem 0',
  },
  batchSub: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    margin: 0,
    maxWidth: '650px',
    lineHeight: '1.5',
  },
  // Step Cards (File Upload Workflow)
  importStepCardsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
    marginTop: '1.25rem',
    marginBottom: '0.75rem',
  },
  importStepCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    padding: '1rem 1.15rem',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    background: 'rgba(15, 23, 42, 0.6)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  stepCardIcon: {
    fontSize: '1.35rem',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    flexShrink: 0,
  },
  stepCardTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: '0.2rem',
  },
  stepCardSub: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardClearBtn: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    borderRadius: '50%',
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    cursor: 'pointer',
    flexShrink: 0,
  },
  stepCardToggleText: {
    fontSize: '0.75rem',
    color: '#38bdf8',
    fontWeight: '600',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    background: 'rgba(56, 189, 248, 0.1)',
    flexShrink: 0,
  },
  importNoteText: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    margin: '0.25rem 0 1.25rem 0',
    fontStyle: 'italic',
  },
  importErrorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    color: '#fca5a5',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
  },
  closeAlertBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fca5a5',
    cursor: 'pointer',
    fontSize: '0.9rem',
    padding: '0 0.25rem',
  },
  conflictBanner: {
    background: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '1.25rem',
  },
  conflictSwitchBtn: {
    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    border: 'none',
    color: '#ffffff',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  conflictKeepBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#cbd5e1',
    padding: '0.5rem 0.85rem',
    borderRadius: '6px',
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
  importSummaryBanner: {
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    marginBottom: '1.25rem',
  },
  summaryStatsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flexWrap: 'wrap',
  },
  summaryBadgeGreen: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34d399',
    fontSize: '0.8rem',
    padding: '0.3rem 0.65rem',
    borderRadius: '6px',
  },
  summaryBadgeAmber: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    color: '#fbbf24',
    fontSize: '0.8rem',
    padding: '0.3rem 0.65rem',
    borderRadius: '6px',
  },
  summaryBadgeRed: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: '0.8rem',
    padding: '0.3rem 0.65rem',
    borderRadius: '6px',
  },
  detailsToggleBtn: {
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    color: '#38bdf8',
    padding: '0.3rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  clearImportBtn: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#94a3b8',
    padding: '0.3rem 0.7rem',
    borderRadius: '6px',
    fontSize: '0.78rem',
    cursor: 'pointer',
  },
  importDetailsBox: {
    marginTop: '0.85rem',
    paddingTop: '0.85rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  matchedPill: {
    display: 'inline-block',
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    color: '#a7f3d0',
    fontSize: '0.75rem',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
  },
  periodAndTemplateBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.25rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  downloadTemplateBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    padding: '0.5rem 0.9rem',
    borderRadius: '8px',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  statusImported: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
  },
  batchPeriodRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  batchValInput: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    color: '#f8fafc',
    padding: '0.45rem 0.6rem',
    fontSize: '0.88rem',
    width: '90px',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  batchSelect: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    color: '#cbd5e1',
    padding: '0.45rem 0.6rem',
    fontSize: '0.82rem',
  },
  batchNoteInput: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    color: '#cbd5e1',
    padding: '0.45rem 0.6rem',
    fontSize: '0.82rem',
    width: '180px',
  },
  batchActionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    flexWrap: 'wrap',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  batchDraftBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#cbd5e1',
    padding: '0.65rem 1.25rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  batchSubmitBtn: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    color: '#ffffff',
    padding: '0.65rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '700',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
  },
  // Officer quick nav row
  officerNavRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    marginTop: '2rem',
    marginBottom: '1rem',
  },
  officerNavBtn: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.6rem 1rem',
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
};

export default OfficerDataEntryPage;
