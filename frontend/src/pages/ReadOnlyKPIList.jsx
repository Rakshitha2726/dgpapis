import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import kpiService from '../services/kpiService';

/**
 * ReadOnlyKPIList.jsx
 * Simple read-only table showing KPI name, associated department or scope, and active status.
 * No add, edit, or deactivate actions are provided.
 */
const ReadOnlyKPIList = () => {
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await kpiService.getAllKPIs({ includeInactive: 'true' });
        setKpis(data.kpis || []);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load KPIs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={styles.page}>
      <Navbar />
      <main style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <Link to="/admin" style={styles.backLink}>← Back to Admin Dashboard</Link>
            <h1 style={styles.pageTitle}>🎯 Global KPI Configuration</h1>
            <p style={styles.pageSubtitle}>Current active and inactive Key Performance Indicators (Read-only)</p>
          </div>
        </div>

        {loading ? (
          <p style={styles.infoText}>Loading KPIs...</p>
        ) : error ? (
          <p style={styles.errorText}>{error}</p>
        ) : kpis.length === 0 ? (
          <p style={styles.infoText}>No KPIs found.</p>
        ) : (
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>KPI Name</th>
                  <th style={styles.th}>Department / Scope</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((kpi) => (
                  <tr key={kpi.id} style={styles.tr}>
                    <td style={styles.td}><strong>{kpi.name}</strong></td>
                    <td style={styles.td}>
                      {kpi.department ? `${kpi.department.name} (${kpi.department.code})` : kpi.scope || '—'}
                    </td>
                    <td style={styles.td}>
                      {kpi.is_active ? (
                        <span style={styles.statusActive}>● Active</span>
                      ) : (
                        <span style={styles.statusInactive}>○ Inactive</span>
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
  statusActive: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.15)',
    padding: '0.2rem 0.65rem',
    borderRadius: '12px',
  },
  statusInactive: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#94a3b8',
    background: 'rgba(148, 163, 184, 0.15)',
    padding: '0.2rem 0.65rem',
    borderRadius: '12px',
  },
};

export default ReadOnlyKPIList;
