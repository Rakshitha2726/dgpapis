/**
 * pages/RankingPage.jsx
 * ----------------------
 * Department Rankings page — accessible to all authenticated roles.
 *
 * Features:
 *  - Period selector to view rankings for any year/month
 *  - Ranked departments table (complete data only)
 *  - Unranked departments listed separately with reason
 *  - Admin: "Calculate All" button to trigger batch score calculation
 *  - Illustrative disclaimer prominently shown
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getDepartmentRankings, calculateAllScores } from '../services/scoreService';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const LABEL_COLORS = {
  'Excellent':         { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#34d399' },
  'Good':              { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', text: '#60a5fa' },
  'Needs Improvement': { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24' },
  'Poor':              { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  text: '#f87171' },
};

const RANK_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

const RankingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [periodYear,   setPeriodYear]   = useState(currentYear);
  const [periodMonth,  setPeriodMonth]  = useState(currentMonth);
  const [rankings,     setRankings]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [calculating,  setCalculating]  = useState(false);
  const [error,        setError]        = useState('');
  const [calcMessage,  setCalcMessage]  = useState('');

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError('');
    setRankings(null);
    setCalcMessage('');
    try {
      const res = await getDepartmentRankings(periodYear, periodMonth);
      setRankings(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch rankings.');
    } finally {
      setLoading(false);
    }
  }, [periodYear, periodMonth]);

  const handleCalculateAll = useCallback(async () => {
    setCalculating(true);
    setCalcMessage('');
    setError('');
    try {
      const res = await calculateAllScores(periodYear, periodMonth);
      setCalcMessage(`✅ Score calculation complete for ${MONTH_NAMES[periodMonth - 1]} ${periodYear}. ${res.data.total_processed} departments processed.`);
      // Auto-refresh rankings
      const rankRes = await getDepartmentRankings(periodYear, periodMonth);
      setRankings(rankRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Calculation failed.');
    } finally {
      setCalculating(false);
    }
  }, [periodYear, periodMonth]);

  return (
    <div style={S.page}>
      <Navbar />
      <main style={S.container}>

        {/* Header */}
        <div style={S.card}>
          <div style={S.header}>
            <span style={S.icon}>🏆</span>
            <div>
              <h1 style={S.title}>Department Performance Rankings</h1>
              <p style={S.subtitle}>
                Compare department performance scores across all ministries for a selected reporting period.
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={S.disclaimer}>
            <span>⚠️</span>
            <div>
              <strong>Illustrative Project Values</strong> — Rankings are based on research-paper scoring formulas
              used for demonstration purposes. Performance labels, weights, and thresholds are
              <u> not</u> official government standards or evaluations.
            </div>
          </div>

          {/* Controls */}
          <div style={S.controlRow}>
            <div style={S.filterGroup}>
              <label style={S.label}>Year</label>
              <input type="number" value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))}
                min={2000} max={2100} style={S.input} />
            </div>
            <div style={S.filterGroup}>
              <label style={S.label}>Month</label>
              <select value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))} style={S.select}>
                {MONTH_NAMES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <button onClick={fetchRankings} disabled={loading} style={S.btnPrimary}>
              {loading ? 'Loading…' : '🏆 View Rankings'}
            </button>
            {isAdmin && (
              <button onClick={handleCalculateAll} disabled={calculating || loading} style={S.btnSecondary}>
                {calculating ? 'Calculating…' : '⚡ Calculate All Scores'}
              </button>
            )}
          </div>

          {calcMessage && <div style={S.successBox}>{calcMessage}</div>}
          {error && <div style={S.errorBox}>{error}</div>}
        </div>

        {/* Rankings Result */}
        {rankings && (
          <>
            {/* Summary Stats */}
            <div style={S.statsGrid}>
              {[
                { label: 'Period',         value: `${MONTH_NAMES[rankings.period_month - 1]} ${rankings.period_year}` },
                { label: 'Ranked',         value: rankings.total_ranked },
                { label: 'Unranked',       value: rankings.total_unranked },
                { label: 'Total Scored',   value: rankings.total_scored },
              ].map((s) => (
                <div key={s.label} style={S.statCard}>
                  <div style={S.statValue}>{s.value}</div>
                  <div style={S.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Ranked Departments */}
            {rankings.ranked_departments?.length > 0 ? (
              <div style={S.resultCard}>
                <h2 style={S.sectionTitle}>🏅 Ranked Departments</h2>
                <p style={S.sectionNote}>Departments with complete KPI submissions for this period.</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Rank','Department','Code','Score','Performance','Calculated At'].map((h) => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.ranked_departments.map((dept) => {
                        const lStyle = LABEL_COLORS[dept.performance_label] || {};
                        const isMyDept = user?.department_id === dept.department_id;
                        return (
                          <tr key={dept.department_id} style={{
                            background: isMyDept
                              ? 'rgba(99,102,241,0.08)'
                              : dept.rank % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                          }}>
                            <td style={{ ...S.td, textAlign: 'center', fontSize: '1.2rem' }}>
                              {RANK_MEDALS[dept.rank] || `#${dept.rank}`}
                            </td>
                            <td style={S.td}>
                              <strong>{dept.department_name}</strong>
                              {isMyDept && <span style={S.myDeptTag}> 👤 Your Dept</span>}
                            </td>
                            <td style={{ ...S.td, color: '#94a3b8', fontFamily: 'monospace' }}>
                              {dept.department_code}
                            </td>
                            <td style={{ ...S.tdNum, fontSize: '1.1rem', fontWeight: '800', color: lStyle.text }}>
                              {Number(dept.overall_score).toFixed(2)}
                            </td>
                            <td style={S.td}>
                              <span style={{ ...S.labelTag, background: lStyle.bg, border: `1px solid ${lStyle.border}`, color: lStyle.text }}>
                                {dept.performance_label}
                              </span>
                            </td>
                            <td style={{ ...S.td, color: '#64748b', fontSize: '0.8rem' }}>
                              {dept.calculated_at ? new Date(dept.calculated_at).toLocaleString() : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={S.emptyBox}>
                <p>No departments with complete scores for this period.</p>
                {isAdmin && <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Use "Calculate All Scores" to generate rankings.</p>}
              </div>
            )}

            {/* Unranked Departments */}
            {rankings.unranked_departments?.length > 0 && (
              <div style={S.resultCard}>
                <h2 style={S.sectionTitle}>⚠️ Unranked Departments</h2>
                <p style={S.sectionNote}>
                  Departments with incomplete KPI submissions. Not included in official ranking.
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Department','Code','KPIs Submitted','Partial Score','Reason'].map((h) => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.unranked_departments.map((dept, idx) => (
                        <tr key={dept.department_id} style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                          <td style={S.td}><strong>{dept.department_name}</strong></td>
                          <td style={{ ...S.td, color: '#94a3b8', fontFamily: 'monospace' }}>{dept.department_code}</td>
                          <td style={{ ...S.tdNum, color: '#fbbf24' }}>{dept.submitted_kpi_count}/{dept.active_kpi_count}</td>
                          <td style={{ ...S.tdNum, color: '#94a3b8' }}>
                            {dept.overall_score !== null ? Number(dept.overall_score).toFixed(2) : '—'}
                          </td>
                          <td style={{ ...S.td, color: '#fbbf24', fontSize: '0.8rem' }}>{dept.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Score Legend */}
            <div style={S.legendCard}>
              <strong>🎯 Performance Labels (Illustrative Project Values)</strong>
              <div style={S.legendGrid}>
                {[
                  { label: 'Excellent',          range: '90–100',    key: 'Excellent' },
                  { label: 'Good',                range: '75–89.99',  key: 'Good' },
                  { label: 'Needs Improvement',   range: '60–74.99',  key: 'Needs Improvement' },
                  { label: 'Poor',                range: '< 60',      key: 'Poor' },
                ].map((item) => {
                  const c = LABEL_COLORS[item.key];
                  return (
                    <div key={item.key} style={{ ...S.legendItem, background: c.bg, border: `1px solid ${c.border}` }}>
                      <strong style={{ color: c.text }}>{item.label}</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.range}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <button onClick={() => navigate(-1)} style={S.backBtn}>← Back</button>
      </main>
    </div>
  );
};

const S = {
  page:         { minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  container:    { maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' },
  card:         { background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem' },
  header:       { display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  icon:         { fontSize: '2.5rem', background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: '12px', padding: '0.6rem 0.9rem' },
  title:        { fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem 0' },
  subtitle:     { color: '#94a3b8', margin: 0, fontSize: '0.875rem' },
  disclaimer:   { display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '0.875rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#fcd34d', lineHeight: '1.5' },
  controlRow:   { display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' },
  filterGroup:  { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label:        { fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:        { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: '#f8fafc', fontSize: '0.9rem', width: '110px' },
  select:       { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: '#f8fafc', fontSize: '0.9rem' },
  btnPrimary:   { background: 'linear-gradient(135deg, #eab308, #ca8a04)', color: '#0f172a', border: 'none', borderRadius: '8px', padding: '0.6rem 1.5rem', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem' },
  btnSecondary: { background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.5rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' },
  successBox:   { marginTop: '1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#34d399', fontSize: '0.875rem' },
  errorBox:     { marginTop: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#f87171', fontSize: '0.875rem' },
  statsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard:     { background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' },
  statValue:    { fontSize: '1.6rem', fontWeight: '900', color: '#f8fafc', marginBottom: '0.25rem' },
  statLabel:    { fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  resultCard:   { background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.4rem 0', color: '#f1f5f9' },
  sectionNote:  { color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1.25rem 0' },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th:           { background: 'rgba(15,23,42,0.8)', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.72rem', padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  td:           { padding: '0.75rem 0.75rem', color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  tdNum:        { padding: '0.75rem 0.75rem', color: '#f1f5f9', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700' },
  myDeptTag:    { fontSize: '0.75rem', color: '#818cf8', marginLeft: '0.4rem' },
  labelTag:     { borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.78rem', fontWeight: '700' },
  emptyBox:     { background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: '#64748b', marginBottom: '1.5rem' },
  legendCard:   { background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' },
  legendGrid:   { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' },
  legendItem:   { borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  backBtn:      { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem' },
};

export default RankingPage;
