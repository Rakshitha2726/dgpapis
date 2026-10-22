/**
 * pages/ForecastingPage.jsx
 * --------------------------
 * Stage 10: Predictive Performance Intelligence & Historical Forecasting.
 *
 * Role access: Admin, Policymaker.
 *
 * Displays:
 *  - Horizon selector (1–6 months ahead)
 *  - Projected leaderboard (comparable departments only, ranked)
 *  - Unranked / partial departments section with explanation
 *  - Model validation summary (Holt's Damped vs. Naïve RMSE comparison)
 *  - Expandable per-department trajectory detail
 *  - Experimental disclaimer prominently shown
 */

import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import forecastService from '../services/forecastService';

const HORIZON_OPTIONS = [1, 2, 3, 4, 5, 6];

const TRAJECTORY_CONFIG = {
  UPWARD:   { icon: '↑', color: '#34d399', label: 'Upward' },
  DOWNWARD: { icon: '↓', color: '#f87171', label: 'Downward' },
  STABLE:   { icon: '→', color: '#fbbf24', label: 'Stable' },
};

const STATUS_CONFIG = {
  ON_TRACK: { color: '#34d399', bg: 'rgba(16,185,129,0.12)', label: 'On Track' },
  AT_RISK:  { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  label: 'At Risk' },
  OFF_TRACK:{ color: '#f87171', bg: 'rgba(239,68,68,0.12)',   label: 'Off Track' },
};

const RANK_MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatScore(val) {
  if (val === null || val === undefined) return 'N/A';
  return Number(val).toFixed(2);
}

function getLabelColor(l) {
  if (l === 'Excellent') return { text: '#34d399', bg: 'rgba(16,185,129,0.12)' };
  if (l === 'Good') return { text: '#38bdf8', bg: 'rgba(56,189,248,0.12)' };
  if (l === 'Needs Improvement') return { text: '#fbbf24', bg: 'rgba(245,158,11,0.12)' };
  if (l === 'Poor') return { text: '#f87171', bg: 'rgba(239,68,68,0.12)' };
  return { text: '#cbd5e1', bg: 'rgba(255,255,255,0.05)' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModelBenchmark({ summary }) {
  if (!summary) return null;
  const { evaluated_kpi_series_count, average_holt_damped_rmse, average_naive_baseline_rmse, net_model_improvement_pct, superior_model } = summary;
  const holtBetter = superior_model === 'HOLT_DAMPED_TREND';

  return (
    <div style={styles.benchmarkCard}>
      <div style={styles.benchmarkHeader}>
        <span style={styles.benchmarkIcon}>📐</span>
        <div>
          <div style={styles.benchmarkTitle}>Model Accuracy Benchmark (Walk-Forward Validation)</div>
          <div style={styles.benchmarkSubtitle}>
            Holt's Damped Trend vs. Naïve Last-Value Baseline — {evaluated_kpi_series_count} KPI series evaluated
          </div>
        </div>
      </div>
      <div style={styles.benchmarkGrid}>
        <div style={{ ...styles.benchmarkStat, borderColor: holtBetter ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)' }}>
          <div style={styles.benchmarkStatLabel}>Holt's Damped RMSE</div>
          <div style={{ ...styles.benchmarkStatValue, color: holtBetter ? '#34d399' : '#f8fafc' }}>
            {average_holt_damped_rmse}
            {holtBetter && <span style={styles.winnerBadge}>✓ Superior</span>}
          </div>
        </div>
        <div style={{ ...styles.benchmarkStat, borderColor: !holtBetter ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)' }}>
          <div style={styles.benchmarkStatLabel}>Naïve Baseline RMSE</div>
          <div style={{ ...styles.benchmarkStatValue, color: !holtBetter ? '#fbbf24' : '#94a3b8' }}>
            {average_naive_baseline_rmse}
            {!holtBetter && <span style={{ ...styles.winnerBadge, background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>✓ Superior</span>}
          </div>
        </div>
        <div style={styles.benchmarkStat}>
          <div style={styles.benchmarkStatLabel}>Net Improvement</div>
          <div style={{ ...styles.benchmarkStatValue, color: net_model_improvement_pct >= 0 ? '#34d399' : '#f87171' }}>
            {net_model_improvement_pct >= 0 ? '+' : ''}{net_model_improvement_pct}%
          </div>
        </div>
      </div>
    </div>
  );
}

function DepartmentForecastPanel({ dept, horizon }) {
  const [expanded, setExpanded] = useState(false);
  const firstStep = dept.partial_trajectory?.[0];

  return (
    <div style={styles.unrankedCard}>
      <div style={styles.unrankedCardHeader}>
        <div>
          <span style={styles.deptCodeBadge}>{dept.department_code}</span>
          <span style={{ marginLeft: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>{dept.department_name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {firstStep && (
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Partial Score: <strong style={{ color: '#fbbf24' }}>{formatScore(firstStep.projected_overall_score)}</strong>
            </span>
          )}
          <span style={styles.partialBadge}>{dept.complete_kpis}/{dept.total_active_kpis} KPIs</span>
          <button onClick={() => setExpanded(e => !e)} style={styles.expandBtn}>{expanded ? 'Hide ▲' : 'Details ▼'}</button>
        </div>
      </div>
      <div style={styles.unrankedReason}>{dept.reason}</div>
      {expanded && dept.partial_trajectory && (
        <div style={styles.trajBox}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
            Partial trajectory (excluded from leaderboard — not comparable):
          </div>
          {dept.partial_trajectory.map(step => (
            <div key={step.step} style={styles.stepRow}>
              <span style={styles.stepLabel}>{step.period_label}</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>{formatScore(step.projected_overall_score)}</span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{step.projected_performance_label}</span>
              <span style={styles.incompleteTag}>Partial — Not Ranked</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RankedDepartmentCard({ dept, rank }) {
  const [expanded, setExpanded] = useState(false);
  const medal = RANK_MEDAL[rank] || `#${rank}`;
  const firstStep = dept.projected_trajectory_summary?.[0];
  const label = firstStep?.projected_performance_label || dept.projected_next_label || '—';
  const score = dept.projected_next_score;
  const lc = getLabelColor(label);

  return (
    <div style={styles.rankedCard}>
      <div style={styles.rankedCardHeader}>
        <span style={styles.rankMedalBig}>{medal}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={styles.rankedDeptCode}>{dept.department_code}</span>
            <span style={styles.rankedDeptName}>{dept.department_name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
            <span style={styles.projScore}>{formatScore(score)} / 100</span>
            <span style={{ ...styles.labelTag, background: lc.bg, color: lc.text }}>{label}</span>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} style={styles.expandBtn}>
          {expanded ? 'Collapse ▲' : 'Trajectory ▼'}
        </button>
      </div>

      <div style={styles.barTrack}>
        <div style={{ ...styles.barFill, width: `${Math.min(score ?? 0, 100)}%` }} />
      </div>

      {!expanded && dept.projected_trajectory_summary && (
        <div style={styles.stepsInline}>
          {dept.projected_trajectory_summary.map(step => (
            <div key={step.step} style={styles.miniStep}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{step.period_label}</div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#a78bfa' }}>
                {formatScore(step.projected_overall_score)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{step.projected_performance_label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const ForecastingPage = () => {
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
      const res = await forecastService.getSystemForecast(h);
      setData(res);
      setFetched(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load forecasting data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleHorizonChange = (h) => {
    setHorizon(h);
    setFetched(false);
    setData(null);
  };

  const backPath = user?.role === 'admin' ? '/admin' : '/policymaker';
  const rankingsPath = user?.role === 'admin' ? '/admin/rankings' : '/policymaker/rankings';

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.container}>
        {/* Header Banner */}
        <div style={styles.bannerCard}>
          <div style={styles.bannerHeader}>
            <div style={styles.bannerLeft}>
              <span style={styles.bannerIcon}>🔮</span>
              <div>
                <h1 style={styles.bannerTitle}>Predictive Governance Intelligence</h1>
                <p style={styles.bannerSubtitle}>
                  Stage 10 — Projected Performance Leaderboard &amp; Forecasting Analytics · {user?.name}
                </p>
              </div>
            </div>
            <button onClick={() => navigate(backPath)} style={styles.backBtn}>← Dashboard</button>
          </div>

          <div style={styles.disclaimer}>
            ⚠️ <strong>EXPERIMENTAL STATISTICAL PROJECTION</strong> — Forecasts use Holt's Damped Linear Trend
            model benchmarked against a naïve baseline over <strong>6 monthly historical observations</strong>.
            They represent indicative statistical trajectories under status-quo assumptions and do{' '}
            <strong>not</strong> constitute verified predictive certainty or official policy targets.
          </div>
        </div>

        {/* Horizon Controls */}
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

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={styles.loadingBox}>
            <div className="spinner" style={styles.spinner} />
            <p>Computing Holt's Damped Trend forecasts for all departments…</p>
          </div>
        )}

        {/* Results */}
        {!loading && fetched && data && (
          <>
            <ModelBenchmark summary={data.model_validation_summary} />

            {/* Ranked Leaderboard */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>🏆 Projected Leaderboard — {horizon}-Month Horizon</h2>
                  <div style={styles.sectionSub}>
                    {data.ranked_departments_count} department(s) with complete KPI histories, ranked by projected
                    next-period overall score
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={styles.rankCountBadge}>{data.ranked_departments_count} Ranked</span>
                  <Link to={rankingsPath} style={styles.linkBtn}>Actual Rankings ➔</Link>
                </div>
              </div>

              {data.ranked_departments.length === 0 ? (
                <div style={styles.emptyState}>
                  No departments have sufficient KPI history for a complete forecast (minimum 3 monthly observations per KPI required).
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {data.ranked_departments.map(dept => (
                    <RankedDepartmentCard key={dept.department_id} dept={dept} rank={dept.rank} />
                  ))}
                </div>
              )}
            </div>

            {/* Unranked / Partial */}
            {data.unranked_departments.length > 0 && (
              <div style={styles.partialSectionCard}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={{ ...styles.sectionTitle, color: '#fbbf24' }}>
                      ⚠️ Departments with Partial Forecasts — Excluded from Ranking
                    </h2>
                    <div style={styles.sectionSub}>
                      These departments have one or more KPIs with fewer than 3 historical observations.
                      Partial forecasts are clearly labelled and cannot be compared against complete forecasts.
                    </div>
                  </div>
                  <span style={{ ...styles.rankCountBadge, background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                    {data.unranked_departments.length} Excluded
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {data.unranked_departments.map(dept => (
                    <DepartmentForecastPanel key={dept.department_id} dept={dept} horizon={horizon} />
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={styles.footerCard}>
              <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                Horizon: <strong style={{ color: '#a78bfa' }}>{horizon}</strong> month(s) ·
                Departments evaluated: <strong style={{ color: '#f8fafc' }}>{data.total_departments_evaluated}</strong>
              </span>
            </div>
          </>
        )}

        {/* Initial prompt */}
        {!loading && !fetched && !error && (
          <div style={styles.promptBox}>
            <span style={{ fontSize: '3rem' }}>🔮</span>
            <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '1rem' }}>
              Select a horizon and click{' '}
              <strong style={{ color: '#a78bfa' }}>Generate Forecast</strong> to compute projected departmental
              performance trajectories using Holt's Damped Linear Trend model.
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
  sectionCard: { background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem' },
  partialSectionCard: { background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' },
  sectionTitle: { fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.3rem 0' },
  sectionSub: { fontSize: '0.82rem', color: '#94a3b8' },
  rankCountBadge: { fontSize: '0.78rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '0.3rem 0.7rem', borderRadius: '6px', whiteSpace: 'nowrap' },
  emptyState: { textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8', fontSize: '0.9rem' },
  rankedCard: { background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem 1.5rem' },
  rankedCardHeader: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' },
  rankMedalBig: { fontSize: '1.8rem', lineHeight: 1 },
  rankedDeptCode: { fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.5rem', borderRadius: '4px' },
  rankedDeptName: { fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' },
  projScore: { fontSize: '1.35rem', fontWeight: 900, color: '#a78bfa' },
  labelTag: { fontSize: '0.78rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '5px' },
  barTrack: { height: '6px', background: 'rgba(15,23,42,0.8)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)', borderRadius: '3px' },
  stepsInline: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  miniStep: { background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '8px', padding: '0.4rem 0.75rem', textAlign: 'center', minWidth: '70px' },
  expandBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '6px', padding: '0.35rem 0.7rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 },
  unrankedCard: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', padding: '1rem 1.25rem' },
  unrankedCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.4rem' },
  deptCodeBadge: { fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.5rem', borderRadius: '4px' },
  unrankedReason: { fontSize: '0.8rem', color: '#fbbf24', opacity: 0.85, marginTop: '0.2rem' },
  partialBadge: { fontSize: '0.75rem', fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '5px' },
  trajBox: { marginTop: '0.75rem', background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.06)' },
  stepRow: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' },
  stepLabel: { fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700, minWidth: '70px' },
  incompleteTag: { fontSize: '0.72rem', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', padding: '0.1rem 0.4rem', borderRadius: '4px', fontStyle: 'italic' },
  benchmarkCard: { background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem' },
  benchmarkHeader: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' },
  benchmarkIcon: { fontSize: '1.8rem', background: 'rgba(56,189,248,0.1)', padding: '0.5rem', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.2)' },
  benchmarkTitle: { fontWeight: 800, fontSize: '1rem', color: '#f8fafc' },
  benchmarkSubtitle: { fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' },
  benchmarkGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' },
  benchmarkStat: { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.85rem 1rem' },
  benchmarkStatLabel: { fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '0.35rem' },
  benchmarkStatValue: { fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  winnerBadge: { fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '0.15rem 0.4rem', borderRadius: '4px' },
  footerCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem 1.5rem' },
  linkBtn: { fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', padding: '0.45rem 1rem', borderRadius: '7px', textDecoration: 'none' },
};

export default ForecastingPage;
