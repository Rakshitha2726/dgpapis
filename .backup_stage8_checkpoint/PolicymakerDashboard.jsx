/**
 * pages/PolicymakerDashboard.jsx
 * ------------------------------
 * Role-Based Dashboard for Senior Policymakers (Stage 8 - 50% Project Milestone).
 *
 * Provides executive policy intelligence & cross-departmental analytics:
 *  - System-wide performance overview (Average score, Top performer, Active counts)
 *  - Department-wise performance score comparison bars
 *  - Current reporting-period rankings leaderboard
 *  - Historical score trend across reporting periods
 *  - Links to detailed score breakdown and ranking pages
 *  - Strict read-only access.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import dashboardService from '../services/dashboardService';

const PolicymakerDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('9');

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getPolicymakerSummary(selectedYear, selectedMonth);
      setData(res);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load policymaker summary.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedYear, selectedMonth]);

  const overview = data?.overview;
  const rankings = data?.rankings;
  const rankedDepts = rankings?.ranked_departments || [];
  const unrankedDepts = rankings?.unranked_departments || [];

  const getRankBadge = (rank) => {
    if (rank === 1) return { label: '🥇 Rank 1', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' };
    if (rank === 2) return { label: '🥈 Rank 2', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
    if (rank === 3) return { label: '🥉 Rank 3', color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)' };
    return { label: `#${rank}`, color: '#cbd5e1', bg: 'rgba(255, 255, 255, 0.05)' };
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <main style={styles.container}>
        {/* Executive Banner */}
        <div style={styles.bannerCard}>
          <div style={styles.bannerHeader}>
            <div style={styles.bannerTitleGroup}>
              <span style={styles.bannerIcon}>📊</span>
              <div>
                <h1 style={styles.bannerTitle}>Policy Intelligence & Executive Dashboard</h1>
                <p style={styles.bannerSubtitle}>
                  Senior Officer View — Logged in as <strong>{user?.name}</strong> ({user?.email})
                </p>
              </div>
            </div>

            <div style={styles.periodSelectorGroup}>
              <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>Period:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={styles.selectInput}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={styles.selectInput}
              >
                <option value="9">Month 09 (Sep)</option>
                <option value="8">Month 08 (Aug)</option>
                <option value="7">Month 07 (Jul)</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <div className="spinner" style={styles.spinner} />
            <p>Loading Policy Analytics & Department Overview...</p>
          </div>
        ) : error ? (
          <div style={styles.errorBox}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        ) : (
          <>
            {/* System Overview KPI Metrics */}
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>System Average Performance</div>
                <div style={styles.scoreRow}>
                  <span style={styles.scoreBig}>
                    {overview?.average_system_score !== null && overview?.average_system_score !== undefined
                      ? overview.average_system_score
                      : 'N/A'}
                  </span>
                  <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/ 100</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#34d399', marginTop: '0.5rem' }}>
                  Across {overview?.completed_departments_count || 0} completed department evaluations
                </div>
              </div>

              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Top Performing Department</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.2rem' }}>
                  {overview?.top_performing_department
                    ? `${overview.top_performing_department.department_name} (${overview.top_performing_department.department_code})`
                    : 'None Scored'}
                </div>
                {overview?.top_performing_department && (
                  <div style={{ fontSize: '0.88rem', color: '#38bdf8', marginTop: '0.4rem', fontWeight: '700' }}>
                    Score: {overview.top_performing_department.overall_score} / 100 ({overview.top_performing_department.performance_label})
                  </div>
                )}
              </div>

              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Evaluation Submission Status</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc' }}>
                  {overview?.completed_departments_count || 0} Complete
                </div>
                <div style={{ fontSize: '0.82rem', color: '#fbbf24', marginTop: '0.4rem' }}>
                  {overview?.incomplete_departments_count || 0} Incomplete / Pending Data
                </div>
              </div>
            </div>

            {/* Department Performance Scores Comparison */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>🏆 Cross-Department Performance Leaderboard & Comparison</h3>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link to="/policymaker/rankings" style={styles.navLinkBtn}>
                    View Detailed Rankings ➔
                  </Link>
                  <Link to="/policymaker/scores" style={styles.navLinkBtnSecondary}>
                    View KPI Score Breakdown ➔
                  </Link>
                </div>
              </div>

              {rankedDepts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No departments have completed performance data for this period yet.
                </div>
              ) : (
                <div style={styles.comparisonGrid}>
                  {rankedDepts.map((dept) => {
                    const badge = getRankBadge(dept.rank);
                    return (
                      <div key={dept.department_id} style={styles.deptCompareCard}>
                        <div style={styles.deptCompareHeader}>
                          <span style={{ ...styles.rankBadge, background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                          <span style={styles.deptCodeBadge}>{dept.department_code}</span>
                        </div>

                        <h4 style={styles.deptCompareName}>{dept.department_name}</h4>

                        <div style={styles.barTrack}>
                          <div
                            style={{
                              ...styles.barFill,
                              width: `${Math.min(dept.overall_score, 100)}%`,
                            }}
                          />
                        </div>

                        <div style={styles.deptCompareFooter}>
                          <span style={styles.scoreText}>{dept.overall_score} / 100</span>
                          <span style={styles.labelTag}>{dept.performance_label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unranked Departments (Incomplete Data) */}
            {unrankedDepts.length > 0 && (
              <div style={styles.warningSectionCard}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.warningTitle}>⚠️ Departments with Incomplete Performance Submissions</h3>
                  <span style={styles.unrankedCountBadge}>{unrankedDepts.length} Incomplete</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Department</th>
                        <th style={styles.th}>Code</th>
                        <th style={styles.th}>Submitted KPIs</th>
                        <th style={styles.th}>Active KPIs</th>
                        <th style={styles.th}>Status Reason</th>
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
                            <span style={{ color: '#fbbf24', fontWeight: '700' }}>
                              {u.submitted_kpi_count}
                            </span>
                          </td>
                          <td style={styles.td}>{u.active_kpi_count}</td>
                          <td style={styles.td}>
                            <span style={styles.incompleteTag}>{u.reason}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
    border: '1px solid rgba(16, 185, 129, 0.25)',
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
  bannerIcon: {
    fontSize: '2.5rem',
    background: 'rgba(16, 185, 129, 0.15)',
    padding: '0.75rem',
    borderRadius: '14px',
    border: '1px solid rgba(16, 185, 129, 0.3)',
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
  periodSelectorGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(15, 23, 42, 0.6)',
    padding: '0.5rem 0.85rem',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  selectInput: {
    background: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '6px',
    color: '#f8fafc',
    padding: '0.4rem 0.6rem',
    fontSize: '0.85rem',
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
    borderTopColor: '#10b981',
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
    fontSize: '0.82rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.4rem',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.4rem',
  },
  scoreBig: {
    fontSize: '2.5rem',
    fontWeight: '900',
    color: '#10b981',
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
  navLinkBtn: {
    padding: '0.55rem 1rem',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34d399',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '700',
    textDecoration: 'none',
  },
  navLinkBtnSecondary: {
    padding: '0.55rem 1rem',
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '700',
    textDecoration: 'none',
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.25rem',
  },
  deptCompareCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  deptCompareHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  rankBadge: {
    fontSize: '0.78rem',
    fontWeight: '800',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
  },
  deptCodeBadge: {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: '#94a3b8',
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
  },
  deptCompareName: {
    fontSize: '1.05rem',
    fontWeight: '800',
    margin: '0.25rem 0 0.75rem 0',
  },
  barTrack: {
    height: '10px',
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '0.75rem',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
    borderRadius: '5px',
  },
  deptCompareFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#34d399',
  },
  labelTag: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#cbd5e1',
  },
  warningSectionCard: {
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: '16px',
    padding: '1.5rem',
  },
  warningTitle: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: '#fbbf24',
    margin: 0,
  },
  unrankedCountBadge: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#fbbf24',
    background: 'rgba(245, 158, 11, 0.15)',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
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
  incompleteTag: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
};

export default PolicymakerDashboard;
