/**
 * pages/OfficerDashboard.jsx
 * --------------------------
 * Role-Based Dashboard for Department Officers (Stage 8 - 50% Project Milestone).
 *
 * Strictly isolated to the officer's assigned department.
 * Displays:
 *  - Assigned department details
 *  - Current reporting-period performance score & label
 *  - KPI-wise target vs actual table with direction indicator
 *  - Submitted / missing KPI count summary
 *  - Historical score trend bar chart
 *  - Links to Data Entry & Score Breakdown
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import dashboardService from '../services/dashboardService';
import anomalyService from '../services/anomalyService';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Anomaly / data-quality alerts state
  const [anomalyData, setAnomalyData] = useState(null);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [anomalyError, setAnomalyError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await dashboardService.getOfficerSummary();
        setData(res);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load officer dashboard summary.');
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  // Fetch anomaly / data-quality alerts for the officer's department
  useEffect(() => {
    const fetchAnomalies = async () => {
      setAnomalyLoading(true);
      setAnomalyError(null);
      try {
        const res = await anomalyService.getMyDepartmentSummary();
        setAnomalyData(res);
      } catch (err) {
        setAnomalyError(
          err.response?.data?.message || 'Could not load data-quality alerts. Please try again later.'
        );
      } finally {
        setAnomalyLoading(false);
      }
    };
    fetchAnomalies();
  }, []);

  const deptName = user?.department?.name || data?.department?.name || 'Assigned Department';
  const deptCode = user?.department?.code || data?.department?.code || 'DEPT';
  const currentScoreObj = data?.current_score;

  const getLabelColor = (label) => {
    switch (label) {
      case 'Excellent': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Good': return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
      case 'Needs Improvement': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'Poor': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.3)' };
      default: return { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <main style={styles.container}>
        {/* Banner Header */}
        <div style={styles.bannerCard}>
          <div style={styles.bannerHeader}>
            <div style={styles.bannerTitleGroup}>
              <span style={styles.deptIcon}>🏥</span>
              <div>
                <div style={styles.deptCodeTag}>{deptCode}</div>
                <h1 style={styles.bannerTitle}>{deptName}</h1>
                <p style={styles.bannerSubtitle}>
                  Department Officer: <strong>{user?.name}</strong> ({user?.email}) — Isolated Department View
                </p>
              </div>
            </div>

            <div style={styles.actionGroup}>
              <Link to="/officer/data-entry" style={styles.primaryActionBtn}>
                ✏️ Monthly Data Entry
              </Link>
              <Link to="/officer/score" style={styles.secondaryActionBtn}>
                📊 Score Breakdown
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <div className="spinner" style={styles.spinner} />
            <p>Loading Department Performance Summary...</p>
          </div>
        ) : error ? (
          <div style={styles.errorBox}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        ) : (
          <>
            {/* Top Key Metrics Cards */}
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Current Period Performance</div>
                <div style={styles.scoreRow}>
                  <span style={styles.scoreBig}>
                    {currentScoreObj?.overall_score !== null && currentScoreObj?.overall_score !== undefined
                      ? currentScoreObj.overall_score
                      : 'N/A'}
                  </span>
                  <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/ 100</span>
                </div>

                {currentScoreObj?.performance_label && (
                  <div
                    style={{
                      ...styles.labelBadge,
                      background: getLabelColor(currentScoreObj.performance_label).bg,
                      color: getLabelColor(currentScoreObj.performance_label).text,
                      borderColor: getLabelColor(currentScoreObj.performance_label).border,
                    }}
                  >
                    ● {currentScoreObj.performance_label}
                  </div>
                )}
                <div style={styles.periodTag}>
                  Period: {data?.current_period?.year}-{String(data?.current_period?.month).padStart(2, '0')}
                </div>
              </div>

              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>KPI Submission Status</div>
                <div style={styles.metricValue}>
                  {currentScoreObj?.submitted_kpi_count || 0} / {currentScoreObj?.active_kpi_count || data?.active_kpis?.length || 0}
                </div>
                <div style={{ fontSize: '0.82rem', color: currentScoreObj?.data_status === 'complete' ? '#34d399' : '#fbbf24', marginTop: '0.5rem' }}>
                  {currentScoreObj?.data_status === 'complete' ? '✅ All active KPIs submitted' : '⚠️ Missing submission for active KPIs'}
                </div>
              </div>

              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Active KPIs Monitored</div>
                <div style={styles.metricValue}>{data?.active_kpi_count || 0}</div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                  Configured active benchmarks for {deptCode}
                </div>
              </div>
            </div>

            {/* KPI Performance Table */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>🎯 Current Period KPI Performance Breakdown</h3>
                <span style={styles.disclaimerBadge}>⚠️ Illustrative Project Values</span>
              </div>

              {currentScoreObj?.kpi_breakdown?.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
                  No performance data submitted for this reporting period.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>KPI Name</th>
                        <th style={styles.th}>Target</th>
                        <th style={styles.th}>Actual</th>
                        <th style={styles.th}>Direction</th>
                        <th style={styles.th}>Weight</th>
                        <th style={styles.th}>Normalized Score</th>
                        <th style={styles.th}>Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentScoreObj?.kpi_breakdown?.map((kpi) => (
                        <tr key={kpi.kpi_id} style={styles.tr}>
                          <td style={styles.td}>
                            <strong>{kpi.kpi_name}</strong>
                          </td>
                          <td style={styles.td}>
                            {kpi.target_value} <small style={{ color: '#94a3b8' }}>{kpi.unit}</small>
                          </td>
                          <td style={styles.td}>
                            {kpi.actual_value !== null ? (
                              <span style={styles.actualVal}>
                                {kpi.actual_value} <small>{kpi.unit}</small>
                              </span>
                            ) : (
                              <span style={styles.missingBadge}>MISSING</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {kpi.higher_is_better ? (
                              <span style={styles.tagHigher}>Higher ↑</span>
                            ) : (
                              <span style={styles.tagLower}>Lower ↓</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <span style={styles.weightBadge}>{kpi.weight}%</span>
                          </td>
                          <td style={styles.td}>
                            {kpi.normalized_kpi_score !== null ? (
                              <strong>{kpi.normalized_kpi_score}%</strong>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td style={styles.td}>
                            {kpi.weighted_contribution !== null ? (
                              <span style={{ color: '#38bdf8', fontWeight: '800' }}>
                                +{kpi.weighted_contribution.toFixed(2)} pts
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Historical Score Trend Visualizer */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>📈 Department Historical Score Trend</h3>
              </div>

              {data?.history_trend?.length === 0 ? (
                <p style={{ color: '#94a3b8', padding: '1.5rem', textAlign: 'center' }}>
                  No historical score records recorded yet.
                </p>
              ) : (
                <div style={styles.trendContainer}>
                  {data.history_trend.map((item, idx) => (
                    <div key={idx} style={styles.trendBarRow}>
                      <div style={styles.trendPeriodLabel}>{item.period}</div>
                      <div style={styles.trendTrack}>
                        <div
                          style={{
                            ...styles.trendFill,
                            width: `${Math.min(item.overall_score || 0, 100)}%`,
                          }}
                        />
                      </div>
                      <div style={styles.trendScoreVal}>
                        {item.overall_score !== null ? `${item.overall_score} / 100` : 'Incomplete'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          {/* Data-Quality & Anomaly Alerts Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>🛡️ Data Quality &amp; Anomaly Alerts</h3>
              <span style={styles.disclaimerBadge}>ℹ️ Review Flags — Not Proof of Fraud</span>
            </div>

            {anomalyLoading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                <div className="spinner" style={styles.spinner} />
                <p>Checking data quality...</p>
              </div>
            ) : anomalyError ? (
              <div style={styles.errorBox}>
                <span>⚠️</span>
                <div>{anomalyError}</div>
              </div>
            ) : anomalyData ? (
              <>
                {/* Summary row */}
                <div style={styles.anomalySummaryRow}>
                  <div style={styles.anomalyStat}>
                    <span style={styles.anomalyStatLabel}>Data Integrity Score</span>
                    <span style={{
                      ...styles.anomalyStatValue,
                      color: anomalyData.summary?.data_integrity_score !== null && anomalyData.summary?.data_integrity_score !== undefined
                        ? (anomalyData.summary.data_integrity_score >= 80 ? '#34d399' : '#f87171')
                        : '#94a3b8'
                    }}>
                      {anomalyData.summary?.data_integrity_score !== null && anomalyData.summary?.data_integrity_score !== undefined
                        ? `${anomalyData.summary.data_integrity_score}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div style={styles.anomalyStat}>
                    <span style={styles.anomalyStatLabel}>Total Alerts</span>
                    <span style={{
                      ...styles.anomalyStatValue,
                      color: (anomalyData.summary?.total_alerts ?? 0) > 0 ? '#fbbf24' : '#34d399'
                    }}>
                      {anomalyData.summary?.total_alerts ?? 0}
                    </span>
                  </div>
                  <div style={styles.anomalyStat}>
                    <span style={styles.anomalyStatLabel}>High Severity</span>
                    <span style={{
                      ...styles.anomalyStatValue,
                      color: (anomalyData.summary?.high_severity_count ?? 0) > 0 ? '#f87171' : '#94a3b8'
                    }}>
                      {anomalyData.summary?.high_severity_count ?? 0}
                    </span>
                  </div>
                  <div style={styles.anomalyStat}>
                    <span style={styles.anomalyStatLabel}>Period Checked</span>
                    <span style={{ ...styles.anomalyStatValue, color: '#94a3b8', fontSize: '1rem' }}>
                      {anomalyData.period_year}-{String(anomalyData.period_month).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {(anomalyData.alerts?.length ?? 0) === 0 ? (
                  <div style={styles.anomalyClear}>
                    <span style={{ fontSize: '1.5rem' }}>✅</span>
                    <div>
                      <strong style={{ color: '#34d399' }}>All submissions verified clean</strong>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        No statistical anomalies, missing values, or data-quality issues detected for this period.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {anomalyData.alerts.map((alert) => {
                      const isHigh = alert.severity === 'HIGH';
                      const isMed  = alert.severity === 'MEDIUM';
                      const borderColor = isHigh ? '#f87171' : isMed ? '#fbbf24' : '#38bdf8';
                      const typeLabel =
                        alert.check_type === 'HISTORICAL_ANOMALY' ? '📊 Statistical Outlier'
                        : alert.check_type === 'COMPLETENESS'      ? '📋 Missing / Draft Entry'
                        : alert.check_type === 'DATA_QUALITY_RULE' ? '🚨 Data Quality Rule'
                        : alert.check_type;
                      return (
                        <div key={alert.id} style={{ ...styles.anomalyAlertCard, borderLeft: `4px solid ${borderColor}` }}>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                            <span style={{
                              fontSize: '0.72rem', fontWeight: '800', padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: isHigh ? 'rgba(239,68,68,0.15)' : isMed ? 'rgba(245,158,11,0.15)' : 'rgba(56,189,248,0.15)',
                              color: borderColor,
                            }}>
                              {isHigh ? 'HIGH' : isMed ? 'MEDIUM' : 'INFO'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                              {typeLabel}
                            </span>
                          </div>
                          <strong style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>{alert.kpi_name}</strong>
                          <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                            {alert.explanation}
                          </div>
                          {alert.suggested_action && (
                            <div style={{ fontSize: '0.8rem', color: '#6ee7b7', marginTop: '0.35rem' }}>
                              💡 {alert.suggested_action}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={styles.anomalyDisclaimer}>
                  <span>ℹ️</span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {anomalyData.disclaimer ||
                      'An anomaly flag means a value requires review — not that fraud has occurred. It may reflect a legitimate unusual event or a data entry that needs verification.'}
                  </span>
                </div>
              </>
            ) : null}
          </div>

          {/* Quick Navigation */}
          <div style={styles.navRow}>
            <Link to="/officer/score" style={styles.navCard}>
              <span style={{ fontSize: '1.5rem' }}>📊</span>
              <div>
                <div style={styles.navCardTitle}>Score Breakdown</div>
                <div style={styles.navCardSub}>Detailed KPI scores &amp; formula</div>
              </div>
            </Link>
            <Link to="/officer/rankings" style={styles.navCard}>
              <span style={{ fontSize: '1.5rem' }}>🏆</span>
              <div>
                <div style={styles.navCardTitle}>Department Rankings</div>
                <div style={styles.navCardSub}>See how your dept compares</div>
              </div>
            </Link>
            <Link to="/officer/forecast" style={styles.navCard}>
              <span style={{ fontSize: '1.5rem' }}>🔮</span>
              <div>
                <div style={styles.navCardTitle}>Performance Forecast</div>
                <div style={styles.navCardSub}>Predictive trend analysis</div>
              </div>
            </Link>
            <Link to="/officer/data-entry" style={styles.navCard}>
              <span style={{ fontSize: '1.5rem' }}>✏️</span>
              <div>
                <div style={styles.navCardTitle}>Data Entry</div>
                <div style={styles.navCardSub}>Submit / edit monthly KPI data</div>
              </div>
            </Link>
          </div>

        </>
      )}
    </main>
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
  bannerCard: {
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '16px',
    padding: '1.75rem 2rem',
    marginBottom: '1.5rem',
  },
  bannerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.25rem',
  },
  bannerTitleGroup: {
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
  },
  bannerTitle: {
    fontSize: '1.6rem',
    fontWeight: '800',
    margin: '0 0 0.25rem 0',
  },
  bannerSubtitle: {
    color: '#94a3b8',
    margin: 0,
    fontSize: '0.88rem',
  },
  actionGroup: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  primaryActionBtn: {
    padding: '0.75rem 1.25rem',
    background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '0.9rem',
    borderRadius: '10px',
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
  },
  secondaryActionBtn: {
    padding: '0.75rem 1.25rem',
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: '0.9rem',
    borderRadius: '10px',
    textDecoration: 'none',
  },
  loadingBox: {
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
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    padding: '1rem 1.25rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.25rem',
    marginBottom: '1.5rem',
  },
  metricCard: {
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '1.5rem',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.4rem',
  },
  scoreBig: {
    fontSize: '2.5rem',
    fontWeight: '900',
    color: '#38bdf8',
  },
  labelBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '700',
    border: '1px solid',
    marginTop: '0.6rem',
  },
  periodTag: {
    fontSize: '0.78rem',
    color: '#64748b',
    marginTop: '0.4rem',
  },
  metricValue: {
    fontSize: '2.2rem',
    fontWeight: '800',
    color: '#f8fafc',
  },
  sectionCard: {
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: '800',
    margin: 0,
  },
  disclaimerBadge: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#fbbf24',
    background: 'rgba(245, 158, 11, 0.12)',
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.88rem',
  },
  th: {
    padding: '0.85rem 1rem',
    background: 'rgba(15, 23, 42, 0.8)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  td: {
    padding: '0.85rem 1rem',
    color: '#cbd5e1',
    verticalAlign: 'middle',
  },
  actualVal: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  missingBadge: {
    fontSize: '0.72rem',
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.15)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontWeight: '700',
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
  weightBadge: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#a855f7',
    background: 'rgba(168, 85, 247, 0.12)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
  },
  trendContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  trendBarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  trendPeriodLabel: {
    width: '90px',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#94a3b8',
  },
  trendTrack: {
    flex: 1,
    height: '14px',
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '7px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  trendFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)',
    borderRadius: '7px',
    transition: 'width 0.4s ease',
  },
  trendScoreVal: {
    width: '100px',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'right',
  },
  // — Anomaly section styles ————————————————————————————————
  anomalySummaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  anomalyStat: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  anomalyStatLabel: {
    fontSize: '0.72rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  anomalyStatValue: {
    fontSize: '1.5rem',
    fontWeight: '800',
    lineHeight: 1.1,
  },
  anomalyClear: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    background: 'rgba(16, 185, 129, 0.06)',
    border: '1px dashed rgba(16, 185, 129, 0.25)',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    marginBottom: '0.75rem',
  },
  anomalyAlertCard: {
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '1rem 1.1rem',
  },
  anomalyDisclaimer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1.25rem',
    padding: '0.65rem 1rem',
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  // — Navigation row ——————————————————————————————————————————
  navRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  navCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    textDecoration: 'none',
    color: '#f8fafc',
    transition: 'border-color 0.2s, background 0.2s',
  },
  navCardTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    marginBottom: '0.15rem',
  },
  navCardSub: {
    fontSize: '0.78rem',
    color: '#94a3b8',
  },
};

export default OfficerDashboard;
