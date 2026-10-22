/**
 * pages/OfficerForecastPage.jsx
 * ------------------------------
 * Stage 10: Department Officer own-department predictive trajectory view.
 *
 * Role access: Department Officer (own department only — enforced backend).
 *
 * Displays:
 *  - Own department projected overall score trajectory
 *  - Per-KPI forecast table with confidence intervals and target status
 *  - Walk-forward validation accuracy per KPI
 *  - Partial / insufficient data notices
 *  - Experimental disclaimer
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import forecastService from '../services/forecastService';

const HORIZON_OPTIONS = [1, 2, 3, 4, 5, 6];

const STATUS_CONFIG = {
  ON_TRACK: { color: '#34d399', bg: 'rgba(16,185,129,0.12)', label: 'On Track' },
  AT_RISK:  { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', label: 'At Risk' },
  OFF_TRACK:{ color: '#f87171', bg: 'rgba(239,68,68,0.12)',  label: 'Off Track' },
};

const TRAJ_CONFIG = {
  UPWARD:   { icon: '↑', color: '#34d399' },
  DOWNWARD: { icon: '↓', color: '#f87171' },
  STABLE:   { icon: '→', color: '#fbbf24' },
};

function formatScore(val) {
  if (val === null || val === undefined) return 'N/A';
  return Number(val).toFixed(2);
}

function getLabelColor(l) {
  if (l === 'Excellent') return '#34d399';
  if (l === 'Good') return '#38bdf8';
  if (l === 'Needs Improvement') return '#fbbf24';
  if (l === 'Poor') return '#f87171';
  return '#cbd5e1';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OverallTrajectoryPanel({ trajectory, horizon }) {
  if (!trajectory || trajectory.length === 0) return null;
  const maxScore = 100;

  return (
    <div style={styles.sectionCard}>
      <h2 style={styles.sectionTitle}>📈 Projected Overall Department Score</h2>
      <div style={styles.trajGrid}>
        {trajectory.map(step => {
          const score = step.projected_overall_score;
          const label = step.projected_performance_label;
          const labelColor = getLabelColor(label);
          const barPct = Math.min(score ?? 0, 100);

          return (
            <div key={step.step} style={styles.trajStepCard}>
              <div style={styles.trajPeriodLabel}>{step.period_label}</div>
              <div style={{ ...styles.trajScore, color: labelColor }}>{formatScore(score)}</div>
              <div style={{ fontSize: '0.75rem', color: labelColor, marginBottom: '0.5rem' }}>{label}</div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.barFill, width: `${barPct}%`, background: labelColor === '#34d399' ? 'linear-gradient(90deg,#059669,#34d399)' : labelColor === '#38bdf8' ? 'linear-gradient(90deg,#0284c7,#38bdf8)' : labelColor === '#fbbf24' ? 'linear-gradient(90deg,#d97706,#fbbf24)' : 'linear-gradient(90deg,#dc2626,#f87171)' }} />
              </div>
              {!step.is_complete_evaluation && (
                <div style={styles.partialNote}>⚠ Partial evaluation</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiForecastCard({ kf }) {
  const [showBacktest, setShowBacktest] = useState(false);

  if (kf.status === 'INSUFFICIENT_DATA') {
    return (
      <div style={styles.kpiCardInsufficient}>
        <div style={styles.kpiCardHeader}>
          <div>
            <div style={styles.kpiName}>{kf.kpi_name}</div>
            <div style={styles.kpiMeta}>{kf.unit} · weight {kf.weight}%</div>
          </div>
          <span style={styles.insufficientBadge}>⚠ Insufficient Data</span>
        </div>
        <div style={styles.kpiInsufficientNote}>
          {kf.reason} ({kf.observation_count}/{kf.min_required} observations available)
        </div>
      </div>
    );
  }

  const traj = TRAJ_CONFIG[kf.trajectory] || TRAJ_CONFIG.STABLE;
  const bm = kf.validation_benchmark;

  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiCardHeader}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={styles.kpiName}>{kf.kpi_name}</span>
            <span style={{ color: traj.color, fontWeight: 800, fontSize: '1.1rem' }}>{traj.icon}</span>
          </div>
          <div style={styles.kpiMeta}>
            {kf.unit} · weight {kf.weight}% · target {kf.target_value} · last: <strong style={{ color: '#f8fafc' }}>{kf.last_observed_value}</strong>
          </div>
        </div>
        {bm && bm.status === 'VALIDATED' && (
          <button onClick={() => setShowBacktest(v => !v)} style={styles.backtestBtn}>
            {showBacktest ? 'Hide Validation ▲' : 'Validation ▼'}
          </button>
        )}
      </div>

      {/* Backtest accuracy */}
      {showBacktest && bm && bm.status === 'VALIDATED' && (
        <div style={styles.backtestPanel}>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 700 }}>
            Walk-Forward Validation ({bm.evaluation_points} test point{bm.evaluation_points !== 1 ? 's' : ''})
          </div>
          <div style={styles.backtestGrid}>
            <div style={styles.backtestMetric}>
              <div style={styles.backtestLabel}>Holt RMSE</div>
              <div style={{ color: bm.comparison.superior_model === 'HOLT_DAMPED' ? '#34d399' : '#94a3b8', fontWeight: 800 }}>
                {bm.damped_holt.rmse}
              </div>
            </div>
            <div style={styles.backtestMetric}>
              <div style={styles.backtestLabel}>Naïve RMSE</div>
              <div style={{ color: bm.comparison.superior_model === 'NAIVE_BASELINE' ? '#fbbf24' : '#94a3b8', fontWeight: 800 }}>
                {bm.naive.rmse}
              </div>
            </div>
            <div style={styles.backtestMetric}>
              <div style={styles.backtestLabel}>RMSE Improvement</div>
              <div style={{ color: bm.comparison.rmse_improvement_pct >= 0 ? '#34d399' : '#f87171', fontWeight: 800 }}>
                {bm.comparison.rmse_improvement_pct >= 0 ? '+' : ''}{bm.comparison.rmse_improvement_pct}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projected periods table */}
      <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Period</th>
              <th style={styles.th}>Forecast</th>
              <th style={styles.th}>Naïve Baseline</th>
              <th style={styles.th}>80% CI</th>
              <th style={styles.th}>95% CI</th>
              <th style={styles.th}>Score</th>
              <th style={styles.th}>Target Status</th>
            </tr>
          </thead>
          <tbody>
            {kf.periods_projected.map(p => {
              const statusCfg = STATUS_CONFIG[p.target_status] || STATUS_CONFIG.ON_TRACK;
              return (
                <tr key={p.step} style={styles.tr}>
                  <td style={styles.td}><strong>{p.period_label}</strong></td>
                  <td style={{ ...styles.td, color: '#a78bfa', fontWeight: 700 }}>{p.forecasted_value}</td>
                  <td style={{ ...styles.td, color: '#94a3b8' }}>{p.naive_baseline_value}</td>
                  <td style={styles.td}>
                    <span style={styles.ciRange}>[{p.confidence_interval_80.lower} – {p.confidence_interval_80.upper}]</span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.ciRange}>[{p.confidence_interval_95.lower} – {p.confidence_interval_95.upper}]</span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{formatScore(p.projected_normalized_score)}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, background: statusCfg.bg, color: statusCfg.color }}>
                      {statusCfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const OfficerForecastPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [horizon, setHorizon] = useState(3);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetched, setFetched] = useState(false);

  const fetchForecast = useCallback(async (h) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await forecastService.getMyDepartmentForecast(h);
      setData(res);
      setFetched(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load department forecast.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleHorizonChange = (h) => {
    setHorizon(h);
    setFetched(false);
    setData(null);
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.container}>
        {/* Banner */}
        <div style={styles.bannerCard}>
          <div style={styles.bannerHeader}>
            <div style={styles.bannerLeft}>
              <span style={styles.bannerIcon}>🔮</span>
              <div>
                <h1 style={styles.bannerTitle}>Department Performance Forecast</h1>
                <p style={styles.bannerSubtitle}>
                  Stage 10 — Predictive Trajectory · {user?.department?.name || 'Your Department'} · {user?.name}
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/officer')} style={styles.backBtn}>← Dashboard</button>
          </div>

          <div style={styles.disclaimer}>
            ⚠️ <strong>EXPERIMENTAL STATISTICAL PROJECTION</strong> — Forecasts use Holt's Damped Linear Trend
            model benchmarked against a naïve baseline over <strong>6 monthly historical observations</strong>.
            They represent indicative statistical trajectories and do <strong>not</strong> constitute verified
            predictive accuracy or official performance targets.
          </div>
        </div>

        {/* Controls */}
        <div style={styles.controlsCard}>
          <div style={styles.controlsLeft}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>Forecast Horizon:</span>
            <div style={styles.horizonBtns}>
              {HORIZON_OPTIONS.map(h => (
                <button
                  key={h}
                  onClick={() => handleHorizonChange(h)}
                  style={{ ...styles.horizonBtn, ...(horizon === h ? styles.horizonBtnActive : {}) }}
                >
                  {h}M
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => fetchForecast(horizon)}
            disabled={loading}
            style={{ ...styles.runBtn, opacity: loading ? 0.65 : 1 }}
          >
            {loading ? 'Computing…' : '▶ Generate Forecast'}
          </button>
        </div>

        {error && (
          <div style={styles.errorBox}><span>⚠️</span><span>{error}</span></div>
        )}

        {loading && (
          <div style={styles.loadingBox}>
            <div className="spinner" style={styles.spinner} />
            <p>Computing Holt's Damped Trend forecast for your department…</p>
          </div>
        )}

        {!loading && fetched && data && (
          <>
            {/* Department Summary */}
            <div style={styles.summaryCard}>
              <div style={styles.summaryLeft}>
                <div style={styles.deptCodeBig}>{data.department_code}</div>
                <div>
                  <div style={styles.deptNameBig}>{data.department_name}</div>
                  <div style={styles.deptMeta}>
                    {data.complete_kpi_forecasts}/{data.total_active_kpis} KPIs with complete historical data
                    {data.partial_data && (
                      <span style={styles.partialDataBadge}> · Partial Data</span>
                    )}
                  </div>
                </div>
              </div>
              {data.partial_data ? (
                <div style={styles.incomparableNotice}>
                  ⚠️ This department has incomplete KPI histories — forecasts are partial and excluded from cross-department ranking.
                </div>
              ) : (
                <div style={styles.comparableBadge}>✓ Complete — Comparable for Ranking</div>
              )}
            </div>

            {/* Incomplete KPI notice */}
            {data.incomplete_kpi_forecasts > 0 && (
              <div style={styles.warningBox}>
                ⚠️ {data.incomplete_kpi_forecasts} KPI(s) have insufficient historical data ({'<'}3 monthly observations) and cannot be forecasted.
                Submit more monthly performance entries to enable full forecasting.
              </div>
            )}

            {/* Overall Trajectory */}
            <OverallTrajectoryPanel trajectory={data.projected_overall_trajectory} horizon={horizon} />

            {/* Per-KPI Forecasts */}
            <div style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>📊 Individual KPI Forecasts</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {data.kpi_forecasts && data.kpi_forecasts.map(kf => (
                  <KpiForecastCard key={kf.kpi_id} kf={kf} />
                ))}
              </div>
            </div>

            {/* Disclaimer footer */}
            <div style={styles.footerCard}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                Horizon: <strong style={{ color: '#a78bfa' }}>{horizon}</strong> month(s) ·
                Model: <strong style={{ color: '#f8fafc' }}>Holt's Damped Linear Trend (φ=0.90)</strong>
              </span>
              <span style={{ color: '#64748b', fontSize: '0.78rem', fontStyle: 'italic' }}>
                {data.disclaimer}
              </span>
            </div>
          </>
        )}

        {!loading && !fetched && !error && (
          <div style={styles.promptBox}>
            <span style={{ fontSize: '3rem' }}>🔮</span>
            <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '1rem' }}>
              Select a horizon and click{' '}
              <strong style={{ color: '#a78bfa' }}>Generate Forecast</strong> to compute your department's
              projected performance trajectory.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: { minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  container: { maxWidth: '1280px', margin: '2rem auto', padding: '0 1.5rem 4rem 1.5rem' },
  bannerCard: {
    background: 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.9) 100%)',
    border: '1px solid rgba(139,92,246,0.3)', borderRadius: '16px', padding: '1.75rem 2rem', marginBottom: '1.25rem',
  },
  bannerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' },
  bannerLeft: { display: 'flex', alignItems: 'center', gap: '1.25rem' },
  bannerIcon: { fontSize: '2.5rem', background: 'rgba(139,92,246,0.15)', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(139,92,246,0.3)' },
  bannerTitle: {
    fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.2rem 0',
    background: 'linear-gradient(90deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  bannerSubtitle: { color: '#94a3b8', margin: 0, fontSize: '0.88rem' },
  backBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  disclaimer: { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '0.85rem 1.25rem', fontSize: '0.8rem', color: '#fde68a', lineHeight: 1.65 },
  controlsCard: { background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' },
  controlsLeft: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  horizonBtns: { display: 'flex', gap: '0.4rem' },
  horizonBtn: { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '6px', padding: '0.4rem 0.7rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 },
  horizonBtnActive: { background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd' },
  runBtn: { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.65rem 1.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, boxShadow: '0 0 16px rgba(124,58,237,0.3)' },
  errorBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.25rem', fontSize: '0.9rem' },
  loadingBox: { textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' },
  spinner: { width: '38px', height: '38px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' },
  promptBox: { textAlign: 'center', padding: '5rem 2rem', color: '#94a3b8' },
  summaryCard: { background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' },
  summaryLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  deptCodeBig: { fontSize: '0.8rem', fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.07)', padding: '0.4rem 0.75rem', borderRadius: '6px' },
  deptNameBig: { fontSize: '1.3rem', fontWeight: 900, color: '#f8fafc' },
  deptMeta: { fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem' },
  partialDataBadge: { color: '#fbbf24', fontWeight: 700 },
  incomparableNotice: { fontSize: '0.82rem', color: '#fbbf24', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '0.6rem 0.9rem', maxWidth: '380px' },
  comparableBadge: { fontSize: '0.82rem', color: '#34d399', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '0.6rem 0.9rem', fontWeight: 700 },
  warningBox: { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '0.85rem 1.25rem', fontSize: '0.85rem', color: '#fde68a', marginBottom: '1.25rem' },
  sectionCard: { background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.75rem 0' },
  trajGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' },
  trajStepCard: { background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.85rem', textAlign: 'center' },
  trajPeriodLabel: { fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.3rem' },
  trajScore: { fontSize: '1.6rem', fontWeight: 900, lineHeight: 1, marginBottom: '0.15rem' },
  barTrack: { height: '5px', background: 'rgba(15,23,42,0.8)', borderRadius: '3px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '3px' },
  partialNote: { fontSize: '0.7rem', color: '#fbbf24', marginTop: '0.3rem' },
  kpiCard: { background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '12px', padding: '1.25rem' },
  kpiCardInsufficient: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '1rem 1.25rem', opacity: 0.85 },
  kpiCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' },
  kpiName: { fontWeight: 800, fontSize: '1rem', color: '#f8fafc' },
  kpiMeta: { fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' },
  kpiInsufficientNote: { fontSize: '0.8rem', color: '#fbbf24' },
  insufficientBadge: { fontSize: '0.75rem', fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', padding: '0.2rem 0.6rem', borderRadius: '5px', whiteSpace: 'nowrap' },
  backtestBtn: { background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8', borderRadius: '6px', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 },
  backtestPanel: { background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.12)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' },
  backtestGrid: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
  backtestMetric: {},
  backtestLabel: { fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem' },
  th: { padding: '0.6rem 0.85rem', background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  td: { padding: '0.6rem 0.85rem', color: '#cbd5e1', verticalAlign: 'middle' },
  ciRange: { fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' },
  statusBadge: { fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', whiteSpace: 'nowrap' },
  footerCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem 1.5rem' },
};

export default OfficerForecastPage;
