/**
 * pages/AdminDashboard.jsx
 * ------------------------
 * Role-Based Dashboard for System Administrators (Stage 8 - 50% Project Milestone).
 *
 * Provides central system oversight & management controls:
 *  - Department & Active KPI counts
 *  - System data submission status breakdown (Submitted vs Draft)
 *  - System activity audit timeline
 *  - Links to Department Management, KPI Management & Rankings
 *  - Clear badge: Admin cannot create or modify officer performance entries.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import dashboardService from '../services/dashboardService';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await dashboardService.getAdminStats();
        setData(res);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load system admin statistics.');
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const stats = data?.stats;
  const recentActivity = data?.recent_activity || [];

  return (
    <div style={styles.page}>
      <Navbar />

      <main style={styles.container}>
        {/* Header Banner */}
        <div style={styles.bannerCard}>
          <div style={styles.bannerHeader}>
            <div style={styles.bannerTitleGroup}>
              <span style={styles.bannerIcon}>👑</span>
              <div>
                <h1 style={styles.bannerTitle}>System Administrator Control Portal</h1>
                <p style={styles.bannerSubtitle}>
                  Global Governance Oversight & System Management — Logged in as <strong>{user?.email}</strong>
                </p>
              </div>
            </div>

            <div style={styles.roleTagGroup}>
              <span style={styles.adminRoleTag}>Role: ADMIN</span>
              <span style={styles.rbacGuardTag}>🛡️ Restricted Access Verified</span>
            </div>
          </div>
        </div>


        {loading ? (
          <div style={styles.loadingBox}>
            <div className="spinner" style={styles.spinner} />
            <p>Loading System Statistics...</p>
          </div>
        ) : error ? (
          <div style={styles.errorBox}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        ) : (
          <>
            {/* System Overview Metrics Cards */}
            <div style={styles.metricsGrid}>
              <Link to="/admin/department-status" style={{ textDecoration: 'none' }}>
                <div style={styles.metricCard} role="button" tabIndex={0}>
                  <div style={styles.metricHeader}>
                    <span style={styles.metricLabel}>Departments Status</span>
                    <span style={styles.metricIcon}>🏛️</span>
                  </div>
                  <div style={styles.metricValRow}>
                    <span style={styles.metricValBig}>{stats?.active_departments || 0}</span>
                    <span style={styles.metricValSub}>/ {stats?.total_departments || 0} Active</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                    {stats?.inactive_departments || 0} Deactivated Department(s)
                  </div>
                </div>
              </Link>

              <Link to="/admin/kpi-status" style={{ textDecoration: 'none' }}>
                <div style={styles.metricCard} role="button" tabIndex={0}>
                  <div style={styles.metricHeader}>
                    <span style={styles.metricLabel}>Global KPI Configuration</span>
                    <span style={styles.metricIcon}>🎯</span>
                  </div>
                  <div style={styles.metricValRow}>
                    <span style={styles.metricValBig}>{stats?.active_kpis || 0}</span>
                    <span style={styles.metricValSub}>/ {stats?.total_kpis || 0} Active</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                    {stats?.inactive_kpis || 0} Inactive KPI Metric(s)
                  </div>
                </div>
              </Link>

              <Link to="/admin/submissions" style={{ textDecoration: 'none' }}>
                <div style={styles.metricCard} role="button" tabIndex={0}>
                  <div style={styles.metricHeader}>
                    <span style={styles.metricLabel}>Performance Data Submissions</span>
                    <span style={styles.metricIcon}>📝</span>
                  </div>
                  <div style={styles.metricValRow}>
                    <span style={styles.metricValBig}>{stats?.submitted_entries || 0}</span>
                    <span style={styles.metricValSub}>Final Submissions</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#fbbf24', marginTop: '0.4rem' }}>
                    {stats?.draft_entries || 0} Draft Record(s) Pending
                  </div>
                </div>
              </Link>
            </div>

            {/* Quick Navigation Panel */}
            <div style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>🛠️ System Management & Analytics Modules</h3>
              <div style={styles.navigationGrid}>
                <div style={styles.navCard}>
                  <h4 style={styles.navCardTitle}>🏛️ Department Management</h4>
                  <p style={styles.navCardDesc}>
                    Add, edit, view, and soft-deactivate government departments.
                  </p>
                  <Link to="/admin/departments" style={styles.navLinkBtn}>
                    Manage Departments ➔
                  </Link>
                </div>

                <div style={styles.navCard}>
                  <h4 style={styles.navCardTitle}>🎯 Global KPI Configuration</h4>
                  <p style={styles.navCardDesc}>
                    Define departmental KPIs, benchmarks, directions, and illustrative weights.
                  </p>
                  <Link to="/admin/kpis" style={styles.navLinkBtn}>
                    Manage KPIs ➔
                  </Link>
                </div>

                <div style={styles.navCard}>
                  <h4 style={styles.navCardTitle}>🏆 Performance Rankings</h4>
                  <p style={styles.navCardDesc}>
                    Calculate scores and view cross-department rankings for any period.
                  </p>
                  <Link to="/admin/rankings" style={styles.navLinkBtn}>
                    View Leaderboard ➔
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent System Submissions Activity */}
            <div style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>🕒 Recent Department Performance Data Submissions</h3>
              {recentActivity.length === 0 ? (
                <p style={{ color: '#94a3b8', padding: '1rem', textAlign: 'center' }}>
                  No performance data submissions recorded yet.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Department</th>
                        <th style={styles.th}>KPI Metric</th>
                        <th style={styles.th}>Reporting Period</th>
                        <th style={styles.th}>Measured Actual</th>
                        <th style={styles.th}>Submission Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((act) => (
                        <tr key={act.id} style={styles.tr}>
                          <td style={styles.td}>
                            <strong>{act.department?.name}</strong> ({act.department?.code})
                          </td>
                          <td style={styles.td}>{act.kpi?.name}</td>
                          <td style={styles.td}>
                            {act.period_year}-{String(act.period_month).padStart(2, '0')}
                          </td>
                          <td style={styles.td}>
                            <strong>{act.actual_value}</strong> <small style={{ color: '#94a3b8' }}>{act.kpi?.unit}</small>
                          </td>
                          <td style={styles.td}>
                            {act.status === 'submitted' ? (
                              <span style={styles.statusSubmitted}>● Submitted</span>
                            ) : (
                              <span style={styles.statusDraft}>○ Draft</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '16px',
    padding: '1.75rem 2rem',
    marginBottom: '1.25rem',
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
    background: 'rgba(239, 68, 68, 0.15)',
    padding: '0.75rem',
    borderRadius: '14px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
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
  roleTagGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.35rem',
  },
  adminRoleTag: {
    background: '#ef4444',
    color: '#ffffff',
    fontWeight: '900',
    fontSize: '0.75rem',
    padding: '0.2rem 0.65rem',
    borderRadius: '6px',
    letterSpacing: '0.5px',
  },
  rbacGuardTag: {
    fontSize: '0.75rem',
    color: '#34d399',
    fontWeight: '600',
  },
  noticeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
  },
  noticeTitle: {
    fontWeight: '800',
    color: '#38bdf8',
    fontSize: '0.92rem',
  },
  noticeText: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
    marginTop: '0.2rem',
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
    borderTopColor: '#ef4444',
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
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.6rem',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: '0.82rem',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricIcon: {
    fontSize: '1.4rem',
  },
  metricValRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5rem',
  },
  metricValBig: {
    fontSize: '2.5rem',
    fontWeight: '900',
    color: '#f8fafc',
  },
  metricValSub: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    fontWeight: '700',
  },
  sectionCard: {
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: '800',
    margin: '0 0 1.25rem 0',
  },
  navigationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.25rem',
  },
  navCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  navCardTitle: {
    fontSize: '1.05rem',
    fontWeight: '800',
    margin: '0 0 0.5rem 0',
  },
  navCardDesc: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    lineHeight: '1.5',
    marginBottom: '1rem',
  },
  navLinkBtn: {
    display: 'inline-block',
    alignSelf: 'flex-start',
    padding: '0.5rem 0.9rem',
    background: 'rgba(56, 189, 248, 0.12)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: '700',
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
};

export default AdminDashboard;
