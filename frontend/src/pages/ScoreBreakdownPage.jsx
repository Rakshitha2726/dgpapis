/**
 * pages/ScoreBreakdownPage.jsx
 * ----------------------------
 * Performance Score Breakdown page for Department Officers (own dept only)
 * and Admins/Policymakers (any department).
 *
 * Shows:
 *  - Department info and period selector
 *  - Overall weighted score with performance label
 *  - KPI-level breakdown table (target, actual, direction, norm. score, weight, contribution)
 *  - Missing KPI warnings
 *  - Disclaimer: Illustrative project values only
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getDepartmentScore, getMyDepartmentScore } from '../services/scoreService';
import { departmentService } from '../services/departmentService';
import anomalyService from '../services/anomalyService';

// Month name helper
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const LABEL_COLORS = {
  'Excellent':         { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#34d399' },
  'Good':              { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', text: '#60a5fa' },
  'Needs Improvement': { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#fbbf24' },
  'Poor':              { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#f87171' },
};

const ScoreBreakdownPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOfficer = user?.role === 'department_officer';

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [departments, setDepartments] = useState([]);
  const [deptId,      setDeptId]      = useState(user?.department_id || '');
  const [periodYear,  setPeriodYear]  = useState(currentYear);
  const [periodMonth, setPeriodMonth] = useState(currentMonth);
  const [scoreData,   setScoreData]   = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  // Load department list for Admin & Policymaker
  useEffect(() => {
    if (!isOfficer) {
      departmentService.getAllDepartments().then((data) => {
        setDepartments(data.departments || []);
      }).catch((err) => {
        console.error('Failed to load departments:', err);
      });
    }
  }, [isOfficer]);

  // Period data-quality & anomaly alerts
  const [anomalyData,    setAnomalyData]    = useState(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  const fetchScore = useCallback(async () => {
    if (!periodYear || !periodMonth) {
      setError('Please select a reporting period.');
      return;
    }
    if (!isOfficer && !deptId) {
      setError('Please select a Department.');
      return;
    }

    setLoading(true);
    setError('');
    setScoreData(null);
    setAnomalyData(null);

    try {
      let res;
      if (isOfficer) {
        res = await getMyDepartmentScore(periodYear, periodMonth);
      } else {
        res = await getDepartmentScore(deptId, periodYear, periodMonth);
      }
      setScoreData(res.data.score);

      // Concurrently or immediately fetch period-specific anomaly checks
      setAnomalyLoading(true);
      try {
        let aRes;
        if (isOfficer) {
          aRes = await anomalyService.getMyDepartmentSummary({ period_year: periodYear, period_month: periodMonth });
        } else if (deptId) {
          aRes = await anomalyService.getDepartmentSummary(deptId, { period_year: periodYear, period_month: periodMonth });
        }
        setAnomalyData(aRes);
      } catch (aErr) {
        console.error('Failed to load period anomaly summary:', aErr);
      } finally {
        setAnomalyLoading(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch score.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isOfficer, deptId, periodYear, periodMonth]);

  // Automatically load current period on initial mount
  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  const label = scoreData?.performance_label;
  const labelStyle = label ? LABEL_COLORS[label] || {} : {};

  return (
    <div style={S.page}>
      <Navbar />
      <main style={S.container}>

        {/* Header */}
        <div style={S.card}>
          <div style={S.header}>
            <span style={S.icon}>📊</span>
            <div>
              <h1 style={S.title}>Performance Score Breakdown</h1>
              <p style={S.subtitle}>
                View detailed KPI-level scores and weighted performance calculation for a reporting period.
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={S.disclaimer}>
            <span>⚠️</span>
            <div>
              <strong>Illustrative Project Values</strong> — Score thresholds (Excellent / Good / Needs Improvement / Poor)
              and KPI weights are research-paper evaluation categories used for demonstration purposes.
              They are <u>not</u> official government standards.
            </div>
          </div>

          {/* Filter Panel */}
          <div style={S.filterPanel}>
            {!isOfficer && (
              <div style={S.filterGroup}>
                <label style={S.label}>Department</label>
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  style={S.select}
                >
                  <option value="">Select Department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div style={S.filterGroup}>
              <label style={S.label}>Year</label>
              <input
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
                min={2000}
                max={2100}
                style={S.input}
              />
            </div>
            <div style={S.filterGroup}>
              <label style={S.label}>Month</label>
              <select
                value={periodMonth}
                onChange={(e) => setPeriodMonth(Number(e.target.value))}
                style={S.select}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <button onClick={fetchScore} disabled={loading} style={S.btn}>
              {loading ? 'Loading…' : '🔍 View Score'}
            </button>
          </div>

          {error && <div style={S.errorBox}>{error}</div>}
        </div>

        {/* Score Result */}
        {scoreData && (
          <div style={S.resultCard}>
            {/* Department & Period Title */}
            <div style={S.resultHeader}>
              <div>
                <h2 style={S.deptTitle}>
                  {scoreData.department_name}
                  <span style={S.deptCode}> ({scoreData.department_code})</span>
                </h2>
                <p style={S.periodLabel}>
                  {MONTH_NAMES[scoreData.period_month - 1]} {scoreData.period_year}
                </p>
              </div>
              {scoreData.overall_score !== null && (
                <div style={{ ...S.scoreBadge, background: labelStyle.bg, border: `1px solid ${labelStyle.border}` }}>
                  <div style={{ ...S.scoreNumber, color: labelStyle.text }}>
                    {scoreData.overall_score.toFixed(2)}
                  </div>
                  <div style={{ ...S.scoreLabel, color: labelStyle.text }}>{scoreData.performance_label}</div>
                </div>
              )}
            </div>

            {/* Status Tags */}
            <div style={S.statusRow}>
              <span style={scoreData.data_status === 'complete' ? S.tagGreen : S.tagAmber}>
                {scoreData.data_status === 'complete' ? '✅ Complete Data' : '⚠️ Incomplete Data'}
              </span>
              <span style={S.tagGrey}>
                {scoreData.submitted_kpi_count} / {scoreData.active_kpi_count} KPIs Submitted
              </span>
            </div>

            {/* Missing KPIs Warning */}
            {scoreData.missing_kpis && scoreData.missing_kpis.length > 0 && (
              <div style={S.missingBox}>
                <strong>⛔ Missing KPI Submissions:</strong>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  The following active KPIs have no submitted entry for this period. 
                  The score is marked <strong>incomplete</strong> and will not appear in rankings.
                </p>
                <ul style={S.missingList}>
                  {scoreData.missing_kpis.map((k) => (
                    <li key={k.id}>
                      <strong>{k.name}</strong> — Weight: {k.weight}% — Unit: {k.unit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* KPI Breakdown Table */}
            {scoreData.kpi_breakdown && scoreData.kpi_breakdown.length > 0 && (
              <div style={S.tableWrapper}>
                <h3 style={S.tableTitle}>KPI Score Breakdown</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['KPI Name','Direction','Target','Actual','Norm. Score','Weight','Contribution','Status'].map((h) => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scoreData.kpi_breakdown.map((kpi, idx) => {
                        const isMissing = kpi.actual_value === null;
                        return (
                          <tr key={kpi.kpi_id} style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                            <td style={S.td}><strong>{kpi.kpi_name}</strong><br/><span style={S.unit}>{kpi.unit}</span></td>
                            <td style={{ ...S.td, color: kpi.higher_is_better ? '#34d399' : '#60a5fa', whiteSpace: 'nowrap' }}>
                              {kpi.higher_is_better ? 'Higher ↑' : 'Lower ↓'}
                            </td>
                            <td style={S.tdNum}>{Number(kpi.target_value).toFixed(2)}</td>
                            <td style={S.tdNum}>{isMissing ? <span style={{ color: '#f87171' }}>—</span> : Number(kpi.actual_value).toFixed(2)}</td>
                            <td style={S.tdNum}>{isMissing ? <span style={{ color: '#f87171' }}>—</span> : kpi.normalized_kpi_score?.toFixed(2)}</td>
                            <td style={S.tdNum}>{kpi.weight}%</td>
                            <td style={S.tdNum}>{isMissing ? <span style={{ color: '#f87171' }}>—</span> : kpi.weighted_contribution?.toFixed(2)}</td>
                            <td style={{ ...S.td, color: isMissing ? '#f87171' : '#34d399', fontSize: '0.78rem' }}>
                              {isMissing ? 'Missing' : 'OK'}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total Row */}
                      <tr style={S.totalRow}>
                        <td colSpan={5} style={{ ...S.td, fontWeight: '700', textAlign: 'right', paddingRight: '1rem' }}>
                          Overall Weighted Score =
                        </td>
                        <td style={S.tdNum}>
                          {scoreData.kpi_breakdown.reduce((s, k) => s + (k.weight || 0), 0)}%
                        </td>
                        <td style={{ ...S.tdNum, fontWeight: '800', color: label ? labelStyle.text : '#f8fafc', fontSize: '1.05rem' }}>
                          {scoreData.overall_score !== null ? scoreData.overall_score.toFixed(2) : '—'}
                        </td>
                        <td style={S.td}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Period Data Quality & Anomaly Checks */}
            <div style={S.anomalySection}>
              <div style={S.anomalyHeader}>
                <h4 style={S.anomalyTitle}>🛡️ Period Data Quality &amp; Anomaly Review</h4>
                <span style={S.disclaimerBadge}>Review Flags · Not Proof of Fraud</span>
              </div>

              {anomalyLoading ? (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                  Checking data quality rules and statistical outliers for this period...
                </div>
              ) : anomalyData ? (
                <>
                  {(anomalyData.alerts?.length ?? 0) === 0 ? (
                    <div style={S.anomalyCleanBox}>
                      <span style={{ fontSize: '1.25rem' }}>✅</span>
                      <div>
                        <strong style={{ color: '#34d399' }}>Clean Period Verification</strong>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                          No statistical outliers, invalid entries, or data-quality anomalies detected for {MONTH_NAMES[periodMonth - 1]} {periodYear}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {anomalyData.alerts.map((alert) => {
                        const isHigh = alert.severity === 'HIGH';
                        const isMed  = alert.severity === 'MEDIUM';
                        const borderCol = isHigh ? '#f87171' : isMed ? '#fbbf24' : '#38bdf8';
                        const typeLabel =
                          alert.check_type === 'HISTORICAL_ANOMALY' ? '📊 Statistical Outlier'
                          : alert.check_type === 'COMPLETENESS'      ? '📋 Missing / Draft Entry'
                          : alert.check_type === 'DATA_QUALITY_RULE' ? '🚨 Data Quality Rule'
                          : alert.check_type;
                        return (
                          <div key={alert.id} style={{ ...S.anomalyAlertCard, borderLeft: `4px solid ${borderCol}` }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <span style={{
                                fontSize: '0.7rem', fontWeight: '800', padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: isHigh ? 'rgba(239,68,68,0.15)' : isMed ? 'rgba(245,158,11,0.15)' : 'rgba(56,189,248,0.15)',
                                color: borderCol,
                              }}>
                                {alert.severity}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                                {typeLabel}
                              </span>
                              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f1f5f9', marginLeft: 'auto' }}>
                                {alert.kpi_name}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                              {alert.explanation}
                            </div>
                            {alert.suggested_action && (
                              <div style={{ fontSize: '0.8rem', color: '#6ee7b7', marginTop: '0.25rem' }}>
                                💡 {alert.suggested_action}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    ℹ️ Automated quality checks flag values that deviate significantly from historical patterns or standard data validation boundaries. Anomaly flags do not imply improper conduct.
                  </p>
                </>
              ) : null}
            </div>

            {/* Formula Reference */}
            <div style={S.formulaBox}>
              <strong>📐 Scoring Formula (Illustrative)</strong>
              <div style={S.formulaGrid}>
                <div>
                  <code>Higher is Better:</code> KPI Score = (Actual / Target) × 100, capped at 100
                </div>
                <div>
                  <code>Lower is Better:</code> KPI Score = (Target / Actual) × 100, capped at 100
                </div>
                <div>
                  <code>Overall Score:</code> Σ (KPI Score × Weight / 100)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Officer Navigation Row */}
        {isOfficer && (
          <div style={S.officerNavRow}>
            <Link to="/officer" style={S.officerNavBtn}>🏠 Officer Dashboard</Link>
            <Link to="/officer/data-entry" style={S.officerNavBtn}>✏️ Data Entry</Link>
            <Link to="/officer/rankings" style={S.officerNavBtn}>🏆 Rankings</Link>
            <Link to="/officer/forecast" style={S.officerNavBtn}>🔮 Forecast</Link>
          </div>
        )}

        {/* Back navigation */}
        <button onClick={() => navigate(-1)} style={S.backBtn}>← Back</button>
      </main>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:      { minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  container: { maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' },
  card: {
    background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem',
  },
  header:    { display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  icon:      { fontSize: '2.5rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '0.6rem 0.9rem' },
  title:     { fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem 0' },
  subtitle:  { color: '#94a3b8', margin: 0, fontSize: '0.875rem' },
  disclaimer: {
    display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: '10px', padding: '0.875rem 1rem', marginBottom: '1.5rem',
    fontSize: '0.85rem', color: '#fcd34d', lineHeight: '1.5',
  },
  filterPanel: { display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label:     { fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:     { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: '#f8fafc', fontSize: '0.9rem', width: '120px' },
  select:    { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: '#f8fafc', fontSize: '0.9rem' },
  btn:       { background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.5rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' },
  errorBox:  { marginTop: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#f87171', fontSize: '0.875rem' },
  resultCard: { background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem' },
  resultHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' },
  deptTitle: { fontSize: '1.4rem', fontWeight: '800', margin: '0 0 0.25rem 0' },
  deptCode:  { color: '#94a3b8', fontWeight: '600' },
  periodLabel: { color: '#94a3b8', margin: 0, fontSize: '0.9rem' },
  scoreBadge: { borderRadius: '14px', padding: '1rem 1.5rem', textAlign: 'center', minWidth: '130px' },
  scoreNumber: { fontSize: '2.25rem', fontWeight: '900', lineHeight: 1 },
  scoreLabel: { fontSize: '0.85rem', fontWeight: '700', marginTop: '0.25rem' },
  statusRow:  { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' },
  tagGreen:   { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '0.3rem 0.7rem', color: '#34d399', fontSize: '0.8rem', fontWeight: '600' },
  tagAmber:   { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '0.3rem 0.7rem', color: '#fbbf24', fontSize: '0.8rem', fontWeight: '600' },
  tagGrey:    { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.3rem 0.7rem', color: '#94a3b8', fontSize: '0.8rem' },
  missingBox: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#fca5a5', fontSize: '0.875rem' },
  missingList: { margin: '0.5rem 0 0 1.25rem', lineHeight: '1.8' },
  tableWrapper: { marginBottom: '1.5rem' },
  tableTitle: { fontSize: '1.05rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.75rem' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th:        { background: 'rgba(15,23,42,0.8)', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.72rem', padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  td:        { padding: '0.65rem 0.75rem', color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  tdNum:     { padding: '0.65rem 0.75rem', color: '#f1f5f9', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' },
  unit:      { fontSize: '0.75rem', color: '#64748b' },
  totalRow:  { background: 'rgba(99,102,241,0.1)', borderTop: '2px solid rgba(99,102,241,0.3)' },
  formulaBox: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#94a3b8' },
  formulaGrid: { display: 'grid', gap: '0.5rem', marginTop: '0.5rem' },
  anomalySection: {
    background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
  },
  anomalyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' },
  anomalyTitle:  { margin: 0, fontSize: '1rem', fontWeight: '700', color: '#f1f5f9' },
  disclaimerBadge: { fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' },
  anomalyCleanBox: {
    display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '0.75rem 1rem',
  },
  anomalyAlertCard: {
    background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px', padding: '0.75rem 1rem',
  },
  officerNavRow: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
  officerNavBtn: {
    background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '0.6rem 1rem', color: '#94a3b8',
    textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  backBtn:   { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem' },
};

export default ScoreBreakdownPage;
