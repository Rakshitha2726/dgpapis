/**
 * components/ForecastIntelligenceSection.jsx
 * ------------------------------------------
 * Stage 10: Predictive Performance Intelligence & Historical Forecasting Section.
 *
 * Visualizes:
 *  - Prominent Experimental Diagnostic Notice (based on 6 monthly observations).
 *  - Walk-Forward Validation Benchmark (Holt Damped Trend vs. Naïve Baseline).
 *  - Official Projected Leaderboard (strictly comparable departments with complete histories).
 *  - Incomparable / Partial Forecast Departments Alert Box.
 *  - Horizon Selector (1, 2, 3, 6 periods ahead).
 *  - Detailed KPI Trajectories with 80% & 95% Confidence Uncertainty Envelopes.
 */

import React, { useState, useEffect } from 'react';
import forecastService from '../services/forecastService';

const ForecastIntelligenceSection = () => {
  const [horizon, setHorizon] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [deptDetail, setDeptDetail] = useState(null);
  const [loadingDept, setLoadingDept] = useState(false);

  const fetchForecastSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await forecastService.getSystemForecast(horizon);
      setSummaryData(data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load predictive forecast intelligence.');
      setLoading(false);
    }
  };

  const fetchDeptDetail = async (deptId) => {
    if (!deptId) return;
    setLoadingDept(true);
    try {
      const data = await forecastService.getDepartmentForecast(deptId, horizon);
      setDeptDetail(data);
      setLoadingDept(false);
    } catch (err) {
      console.error('Failed to load department forecast detail:', err);
      setLoadingDept(false);
    }
  };

  useEffect(() => {
    fetchForecastSummary();
  }, [horizon]);

  useEffect(() => {
    if (selectedDeptId) {
      fetchDeptDetail(selectedDeptId);
    }
  }, [selectedDeptId, horizon]);

  const rankedDepts = summaryData?.ranked_departments || [];
  const unrankedDepts = summaryData?.unranked_departments || [];
  const validationSummary = summaryData?.model_validation_summary;

  const getRankBadge = (rank) => {
    if (rank === 1) return { label: '🥇 Rank 1', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' };
    if (rank === 2) return { label: '🥈 Rank 2', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
    if (rank === 3) return { label: '🥉 Rank 3', color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)' };
    return { label: `#${rank}`, color: '#cbd5e1', bg: 'rgba(255, 255, 255, 0.05)' };
  };

  const getTargetBadge = (status) => {
    if (status === 'ON_TRACK') {
      return { label: '🟢 On Track', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' };
    }
    if (status === 'AT_RISK') {
      return { label: '🟡 At Risk', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' };
    }
    return { label: '🔴 Target Off-Track', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' };
  };

  return (
    <section style={styles.sectionContainer}>
      {/* Header Banner */}
      <div style={styles.headerCard}>
        <div style={styles.titleGroup}>
          <div style={styles.iconBox}>🔮</div>
          <div>
            <div style={styles.tagLine}>Stage 10: Predictive Performance Intelligence</div>
            <h2 style={styles.title}>Historical Department Performance Forecasting</h2>
            <p style={styles.subtitle}>
              Holt’s Damped Linear Trend projections benchmarked against a naïve baseline with walk-forward rolling validation.
            </p>
          </div>
        </div>

        {/* Horizon Selector */}
        <div style={styles.horizonControl}>
          <span style={styles.horizonLabel}>Forecast Horizon:</span>
          <div style={styles.horizonButtonGroup}>
            {[1, 2, 3, 6].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                style={{
                  ...styles.horizonBtn,
                  ...(horizon === h ? styles.horizonBtnActive : {}),
                }}
              >
                +{h} Mo
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mandatory Experimental Statistical Notice */}
      <div style={styles.disclaimerBanner}>
        <span style={{ fontSize: '1.25rem' }}>⚠️</span>
        <div>
          <strong style={{ color: '#fbbf24' }}>Experimental Statistical Diagnostic: </strong>
          <span>
            Primary historical series contain exactly <strong>6 monthly observations</strong> (Jan–Jun 2025).
            Forecasts and uncertainty intervals are empirical statistical extrapolations under status-quo assumptions.
            They are intended for policy exploration and do not claim verified predictive certainty.
          </span>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>
          <div className="spinner" style={styles.spinner} />
          <p>Computing Holt’s Damped Trend models & walk-forward validation benchmarks...</p>
        </div>
      ) : error ? (
        <div style={styles.errorBox}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      ) : (
        <>
          {/* Validation Benchmark Scorecard */}
          {validationSummary && (
            <div style={styles.benchmarkGrid}>
              <div style={styles.benchmarkCard}>
                <div style={styles.benchmarkLabel}>Evaluated Series</div>
                <div style={styles.benchmarkValue}>{validationSummary.evaluated_kpi_series_count} KPI Series</div>
                <div style={styles.benchmarkSub}>Walk-forward backtested across 6 monthly periods</div>
              </div>

              <div style={styles.benchmarkCard}>
                <div style={styles.benchmarkLabel}>Holt Damped RMSE</div>
                <div style={{ ...styles.benchmarkValue, color: '#38bdf8' }}>
                  {validationSummary.average_holt_damped_rmse}
                </div>
                <div style={styles.benchmarkSub}>Damped trend error (phi=0.90)</div>
              </div>

              <div style={styles.benchmarkCard}>
                <div style={styles.benchmarkLabel}>Naïve Baseline RMSE</div>
                <div style={{ ...styles.benchmarkValue, color: '#94a3b8' }}>
                  {validationSummary.average_naive_baseline_rmse}
                </div>
                <div style={styles.benchmarkSub}>Last-observed-value benchmark</div>
              </div>

              <div style={styles.benchmarkCard}>
                <div style={styles.benchmarkLabel}>Net Model Advantage</div>
                <div style={{ ...styles.benchmarkValue, color: validationSummary.net_model_improvement_pct >= 0 ? '#34d399' : '#f87171' }}>
                  {validationSummary.net_model_improvement_pct >= 0 ? `+${validationSummary.net_model_improvement_pct}%` : `${validationSummary.net_model_improvement_pct}%`}
                </div>
                <div style={styles.benchmarkSub}>
                  {validationSummary.superior_model === 'HOLT_DAMPED_TREND'
                    ? 'Holt Damped Trend outperforms baseline'
                    : 'Naïve baseline currently superior'}
                </div>
              </div>
            </div>
          )}

          {/* Official Projected Leaderboard */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>🏆 Projected Cross-Department Leaderboard (Next Reporting Period)</h3>
                <p style={styles.cardSubtitle}>
                  Includes ONLY departments with complete KPI historical series. Comparable under identical evaluation criteria.
                </p>
              </div>
              <span style={styles.rankedCountTag}>{rankedDepts.length} Fully Comparable Departments</span>
            </div>

            {rankedDepts.length === 0 ? (
              <div style={styles.emptyNotice}>
                No departments currently meet the full historical criteria for projected ranking.
              </div>
            ) : (
              <div style={styles.leaderboardGrid}>
                {rankedDepts.map((dept) => {
                  const badge = getRankBadge(dept.rank);
                  const isSelected = selectedDeptId === dept.department_id;
                  return (
                    <div
                      key={dept.department_id}
                      onClick={() => setSelectedDeptId(dept.department_id)}
                      style={{
                        ...styles.deptProjectCard,
                        ...(isSelected ? styles.deptProjectCardActive : {}),
                      }}
                    >
                      <div style={styles.deptCardTop}>
                        <span style={{ ...styles.rankBadge, background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                        <span style={styles.deptCodeTag}>{dept.department_code}</span>
                      </div>

                      <h4 style={styles.deptName}>{dept.department_name}</h4>

                      <div style={styles.scoreRow}>
                        <span style={styles.projectedScoreNumber}>{dept.projected_next_score}</span>
                        <span style={{ fontSize: '1.1rem', color: '#94a3b8' }}>/ 100</span>
                      </div>

                      <div style={styles.deptCardBottom}>
                        <span style={styles.labelTag}>{dept.projected_next_label}</span>
                        <button
                          type="button"
                          style={styles.inspectBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDeptId(dept.department_id);
                          }}
                        >
                          {isSelected ? 'Viewing Trajectory ▲' : 'Inspect Trajectory ▼'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Incomparable Partial Forecast Departments Box */}
          {unrankedDepts.length > 0 && (
            <div style={styles.unrankedCard}>
              <div style={styles.unrankedHeader}>
                <div>
                  <h3 style={styles.unrankedTitle}>⚠️ Incomparable Departments (Partial KPI Histories Excluded from Ranking)</h3>
                  <p style={styles.unrankedSubtitle}>
                    To prevent statistical bias, departments lacking sufficient history on any active KPI are excluded from official rankings.
                  </p>
                </div>
                <span style={styles.unrankedBadge}>{unrankedDepts.length} Partial Forecasts</span>
              </div>

              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Department</th>
                      <th style={styles.th}>Code</th>
                      <th style={styles.th}>Complete KPIs</th>
                      <th style={styles.th}>Total Active</th>
                      <th style={styles.th}>Comparability Reason</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unrankedDepts.map((u) => (
                      <tr key={u.department_id} style={styles.tr}>
                        <td style={styles.td}>
                          <strong>{u.department_name}</strong>
                        </td>
                        <td style={styles.td}>{u.department_code}</td>
                        <td style={styles.td}>
                          <span style={{ color: '#38bdf8', fontWeight: '700' }}>
                            {u.complete_kpis} / {u.total_active_kpis}
                          </span>
                        </td>
                        <td style={styles.td}>{u.total_active_kpis}</td>
                        <td style={styles.td}>
                          <span style={styles.reasonTag}>{u.reason}</span>
                        </td>
                        <td style={styles.td}>
                          <button
                            type="button"
                            onClick={() => setSelectedDeptId(u.department_id)}
                            style={styles.inspectTableBtn}
                          >
                            Inspect Partial Data ➔
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Granular Department & KPI Trajectory Drawer */}
          {selectedDeptId && (
            <div style={styles.drawerCard}>
              <div style={styles.drawerHeader}>
                <div>
                  <h3 style={styles.drawerTitle}>
                    📈 Trajectory Breakdown: {deptDetail?.department_name || 'Loading...'} ({deptDetail?.department_code})
                  </h3>
                  <p style={styles.drawerSubtitle}>
                    Detailed Holt Damped forecasts, confidence envelopes, and target attainment projections across the +{horizon}-month horizon.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDeptId(null)}
                  style={styles.closeDrawerBtn}
                >
                  ✕ Close Breakdown
                </button>
              </div>

              {loadingDept ? (
                <div style={styles.loadingBox}>
                  <div className="spinner" style={styles.spinner} />
                  <p>Loading detailed KPI trajectories and prediction intervals...</p>
                </div>
              ) : (
                <div style={styles.kpiGrid}>
                  {deptDetail?.kpi_forecasts?.map((kpi) => {
                    const isInsuff = kpi.status === 'INSUFFICIENT_DATA';
                    return (
                      <div key={kpi.kpi_id} style={styles.kpiCard}>
                        <div style={styles.kpiCardHeader}>
                          <div>
                            <span style={styles.kpiCategoryTag}>{kpi.category}</span>
                            <h4 style={styles.kpiTitle}>{kpi.kpi_name}</h4>
                          </div>
                          <span style={styles.kpiWeightTag}>{kpi.weight}% Weight</span>
                        </div>

                        {isInsuff ? (
                          <div style={styles.insufficientBox}>
                            <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
                            <div>
                              <strong>Insufficient Historical Data: </strong>
                              {kpi.reason}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={styles.kpiMetaRow}>
                              <div>
                                <span style={styles.metaLabel}>Last Observed:</span>
                                <strong style={styles.metaVal}>{kpi.last_observed_value} {kpi.unit}</strong>
                              </div>
                              <div>
                                <span style={styles.metaLabel}>Target Benchmark:</span>
                                <strong style={styles.metaVal}>{kpi.target_value} {kpi.unit}</strong>
                              </div>
                              <div>
                                <span style={styles.metaLabel}>Trajectory:</span>
                                <strong style={{
                                  ...styles.metaVal,
                                  color: kpi.trajectory === 'UPWARD' ? '#34d399' : kpi.trajectory === 'DOWNWARD' ? '#f87171' : '#94a3b8'
                                }}>
                                  {kpi.trajectory === 'UPWARD' ? '↗ Upward' : kpi.trajectory === 'DOWNWARD' ? '↘ Downward' : '→ Stable'}
                                </strong>
                              </div>
                            </div>

                            {/* Projected Steps Table */}
                            <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
                              <table style={styles.subTable}>
                                <thead>
                                  <tr>
                                    <th style={styles.subTh}>Period</th>
                                    <th style={styles.subTh}>Holt Forecast</th>
                                    <th style={styles.subTh}>Naïve Baseline</th>
                                    <th style={styles.subTh}>80% CI Envelope</th>
                                    <th style={styles.subTh}>95% CI Envelope</th>
                                    <th style={styles.subTh}>Projected Score</th>
                                    <th style={styles.subTh}>Target Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {kpi.periods_projected?.map((step) => {
                                    const badge = getTargetBadge(step.target_status);
                                    return (
                                      <tr key={step.step} style={styles.subTr}>
                                        <td style={styles.subTd}>
                                          <strong>{step.period_label}</strong>
                                        </td>
                                        <td style={{ ...styles.subTd, color: '#38bdf8', fontWeight: '700' }}>
                                          {step.forecasted_value} {kpi.unit}
                                        </td>
                                        <td style={{ ...styles.subTd, color: '#94a3b8' }}>
                                          {step.naive_baseline_value} {kpi.unit}
                                        </td>
                                        <td style={styles.subTd}>
                                          [{step.confidence_interval_80.lower} – {step.confidence_interval_80.upper}]
                                        </td>
                                        <td style={{ ...styles.subTd, color: '#94a3b8', fontSize: '0.8rem' }}>
                                          [{step.confidence_interval_95.lower} – {step.confidence_interval_95.upper}]
                                        </td>
                                        <td style={{ ...styles.subTd, fontWeight: '700', color: '#fbbf24' }}>
                                          {step.projected_normalized_score} / 100
                                        </td>
                                        <td style={styles.subTd}>
                                          <span style={{ ...styles.targetBadge, background: badge.bg, color: badge.color, border: badge.border }}>
                                            {badge.label}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Backtesting Accuracy Footer */}
                            {kpi.validation_benchmark && (
                              <div style={styles.kpiAccuracyFooter}>
                                <span>Walk-Forward Accuracy:</span>
                                <span>Holt RMSE: <strong>{kpi.validation_benchmark.damped_holt.rmse}</strong></span>
                                <span>Naïve RMSE: <strong>{kpi.validation_benchmark.naive.rmse}</strong></span>
                                <span style={{ color: kpi.validation_benchmark.comparison.rmse_improvement_pct >= 0 ? '#34d399' : '#f87171' }}>
                                  ({kpi.validation_benchmark.comparison.rmse_improvement_pct >= 0 ? '+' : ''}{kpi.validation_benchmark.comparison.rmse_improvement_pct}% vs baseline)
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

const styles = {
  sectionContainer: {
    marginTop: '2.5rem',
    fontFamily: "'Inter', sans-serif",
  },
  headerCard: {
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '16px',
    padding: '1.75rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.25rem',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  iconBox: {
    fontSize: '2.25rem',
    background: 'rgba(59, 130, 246, 0.15)',
    padding: '0.75rem',
    borderRadius: '14px',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  tagLine: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#60a5fa',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.2rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 0.25rem 0',
  },
  subtitle: {
    color: '#94a3b8',
    margin: 0,
    fontSize: '0.85rem',
  },
  horizonControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    background: 'rgba(15, 23, 42, 0.6)',
    padding: '0.4rem 0.75rem',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  horizonLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: '600',
  },
  horizonButtonGroup: {
    display: 'flex',
    gap: '0.35rem',
  },
  horizonBtn: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#94a3b8',
    padding: '0.4rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '600',
    transition: 'all 0.15s ease',
  },
  horizonBtnActive: {
    background: '#3b82f6',
    color: '#ffffff',
    borderColor: '#3b82f6',
  },
  disclaimerBanner: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    margin: '1.25rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    fontSize: '0.85rem',
    color: '#f8fafc',
    lineHeight: 1.5,
  },
  benchmarkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  benchmarkCard: {
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1.25rem',
  },
  benchmarkLabel: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.04em',
  },
  benchmarkValue: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0.4rem 0 0.2rem 0',
  },
  benchmarkSub: {
    fontSize: '0.78rem',
    color: '#64748b',
  },
  card: {
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  cardTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: '#f8fafc',
    margin: '0 0 0.2rem 0',
  },
  cardSubtitle: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    margin: 0,
  },
  rankedCountTag: {
    fontSize: '0.8rem',
    fontWeight: '700',
    padding: '0.3rem 0.65rem',
    borderRadius: '6px',
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  leaderboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
  },
  deptProjectCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '1.25rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  deptProjectCardActive: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)',
  },
  deptCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  rankBadge: {
    fontSize: '0.8rem',
    fontWeight: '800',
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
  },
  deptCodeTag: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#94a3b8',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '0.2rem 0.45rem',
    borderRadius: '4px',
  },
  deptName: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#f8fafc',
    margin: '0 0 0.6rem 0',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.35rem',
    marginBottom: '0.85rem',
  },
  projectedScoreNumber: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#fbbf24',
  },
  deptCardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.75rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  labelTag: {
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
  },
  inspectBtn: {
    background: 'transparent',
    border: 'none',
    color: '#38bdf8',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
    padding: 0,
  },
  unrankedCard: {
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px dashed rgba(245, 158, 11, 0.35)',
    borderRadius: '14px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  unrankedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  unrankedTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#fbbf24',
    margin: '0 0 0.2rem 0',
  },
  unrankedSubtitle: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    margin: 0,
  },
  unrankedBadge: {
    fontSize: '0.8rem',
    fontWeight: '700',
    padding: '0.3rem 0.65rem',
    borderRadius: '6px',
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.85rem',
  },
  th: {
    padding: '0.65rem 0.85rem',
    background: 'rgba(15, 23, 42, 0.5)',
    color: '#94a3b8',
    fontWeight: '600',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  td: {
    padding: '0.75rem 0.85rem',
    color: '#f8fafc',
  },
  reasonTag: {
    fontSize: '0.78rem',
    color: '#cbd5e1',
    lineHeight: 1.4,
  },
  inspectTableBtn: {
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: '700',
  },
  drawerCard: {
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '14px',
    padding: '1.75rem',
    marginTop: '1.5rem',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '1rem',
  },
  drawerTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 0.25rem 0',
  },
  drawerSubtitle: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    margin: 0,
  },
  closeDrawerBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#f8fafc',
    padding: '0.4rem 0.85rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '600',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1.25rem',
  },
  kpiCard: {
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1.25rem',
  },
  kpiCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
  },
  kpiCategoryTag: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  kpiTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#f8fafc',
    margin: '0.2rem 0 0 0',
  },
  kpiWeightTag: {
    fontSize: '0.75rem',
    fontWeight: '700',
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    color: '#fbbf24',
  },
  insufficientBox: {
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: '8px',
    padding: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    fontSize: '0.82rem',
    color: '#cbd5e1',
  },
  kpiMetaRow: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
    marginBottom: '0.75rem',
    padding: '0.6rem 0.85rem',
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '8px',
  },
  metaLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginRight: '0.4rem',
  },
  metaVal: {
    fontSize: '0.85rem',
    color: '#f8fafc',
  },
  subTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.82rem',
  },
  subTh: {
    padding: '0.5rem 0.75rem',
    background: 'rgba(15, 23, 42, 0.7)',
    color: '#94a3b8',
    fontWeight: '600',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  subTr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  subTd: {
    padding: '0.6rem 0.75rem',
    color: '#f8fafc',
  },
  targetBadge: {
    fontSize: '0.72rem',
    fontWeight: '700',
    padding: '0.2rem 0.45rem',
    borderRadius: '4px',
  },
  kpiAccuracyFooter: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: '0.78rem',
    color: '#94a3b8',
    marginTop: '0.75rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  loadingBox: {
    padding: '3rem 2rem',
    textAlign: 'center',
    color: '#94a3b8',
  },
  spinner: {
    width: '32px',
    height: '32px',
    margin: '0 auto 1rem auto',
  },
  errorBox: {
    padding: '1.25rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    color: '#f87171',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    margin: '1rem 0',
  },
  emptyNotice: {
    textAlign: 'center',
    padding: '2rem',
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
};

export default ForecastIntelligenceSection;
