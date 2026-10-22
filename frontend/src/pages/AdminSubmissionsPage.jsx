import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import dashboardService from '../services/dashboardService';

/**
 * AdminSubmissionsPage.jsx
 * Displays real performance data submission records across departments.
 * Read-only view with no add, edit, or delete actions.
 */
const AdminSubmissionsPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const data = await dashboardService.getAdminStats();
        // data.recent_activity contains real PerformanceEntry submission records
        setSubmissions(data.recent_activity || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load submissions.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <Link to="/admin" style={styles.backLink}>← Back to Admin Dashboard</Link>
            <h1 style={styles.pageTitle}>📝 Performance Data Submissions</h1>
            <p style={styles.pageSubtitle}>Real submission records across all departments (Read-only)</p>
          </div>
        </div>

        {loading ? (
          <p style={styles.infoText}>Loading submissions...</p>
        ) : error ? (
          <p style={styles.errorText}>{error}</p>
        ) : submissions.length === 0 ? (
          <p style={styles.infoText}>No submissions recorded yet.</p>
        ) : (
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Reporting Period</th>
                  <th style={styles.th}>Submission Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{s.department?.name || s.department_name || (s.departmentId ? `Dept #${s.departmentId}` : '—')}</strong>
                      {s.department?.code && ` (${s.department.code})`}
                    </td>
                    <td style={styles.td}>
                      {s.period_year}-{String(s.period_month).padStart(2, '0')}
                    </td>
                    <td style={styles.td}>
                      {s.status === 'submitted' ? (
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
    maxWidth: '1200px',
    margin: '2rem auto',
    padding: '0 1.5rem 3rem 1.5rem',
  },
  headerRow: {
    marginBottom: '1.5rem',
  },
  backLink: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
    display: 'inline-block',
    marginBottom: '0.75rem',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    margin: '0 0 0.25rem 0',
  },
  pageSubtitle: {
    color: '#94a3b8',
    margin: 0,
    fontSize: '0.9rem',
  },
  infoText: {
    color: '#94a3b8',
    padding: '2rem 0',
  },
  errorText: {
    color: '#f87171',
    padding: '1rem',
    background: 'rgba(239, 68, 68, 0.15)',
    borderRadius: '8px',
  },
  tableCard: {
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.9rem',
  },
  th: {
    padding: '0.9rem 1.25rem',
    background: 'rgba(15, 23, 42, 0.8)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  td: {
    padding: '0.9rem 1.25rem',
    color: '#cbd5e1',
    verticalAlign: 'middle',
  },
  statusSubmitted: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.15)',
    padding: '0.2rem 0.65rem',
    borderRadius: '12px',
  },
  statusDraft: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.15)',
    padding: '0.2rem 0.65rem',
    borderRadius: '12px',
  },
};

export default AdminSubmissionsPage;
