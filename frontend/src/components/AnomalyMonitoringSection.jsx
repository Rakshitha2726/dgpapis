/**
 * components/AnomalyMonitoringSection.jsx
 * ---------------------------------------
 * Stage 9: Automated Anomaly Detection & Data Quality Validation Dashboard Section.
 *
 * Visualizes:
 *  - System Data Integrity Score & alert aggregations
 *  - Statistical outliers identified via Median Absolute Deviation (MAD) & Modified Z-Scores
 *  - Data quality violations (percentage limits, negative values, scale anomalies)
 *  - Completeness alerts for missing KPI submissions
 *  - Granular filtering by Severity, Check Type, and Department
 */

import React, { useState, useEffect } from 'react';
import anomalyService from '../services/anomalyService';

const AnomalyMonitoringSection = ({ selectedYear, selectedMonth }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [checkTypeFilter, setCheckTypeFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const fetchQualityData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await anomalyService.getSystemSummary({
        period_year: selectedYear,
        period_month: selectedMonth,
      });
      setData(res);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data quality validation alerts.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualityData();
  }, [selectedYear, selectedMonth]);

  const summary = data?.summary;
  const allAlerts = data?.alerts || [];

  // Unique departments present in alerts for the filter dropdown
  const uniqueDepts = Array.from(
    new Map(allAlerts.map((a) => [a.department_id, { id: a.department_id, name: a.department_name, code: a.department_code }])).values()
  );

  // Filter alerts
  const filteredAlerts = allAlerts.filter((alert) => {
    if (severityFilter !== 'ALL' && alert.severity !== severityFilter) return false;
    if (checkTypeFilter !== 'ALL' && alert.check_type !== checkTypeFilter) return false;
    if (deptFilter !== 'ALL' && String(alert.department_id) !== String(deptFilter)) return false;
    return true;
  });

  const getSeverityStyle = (severity) => {
    if (severity === 'HIGH') {
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        color: '#f87171',
        label: 'HIGH ALERT',
      };
    }
    if (severity === 'MEDIUM') {
      return {
        bg: 'rgba(245, 158, 11, 0.15)',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        color: '#fbbf24',
        label: 'MEDIUM ALERT',
      };
    }
    return {
      bg: 'rgba(56, 189, 248, 0.15)',
      border: '1px solid rgba(56, 189, 248, 0.4)',
      color: '#38bdf8',
      label: 'INFO',
    };
  };

  const getCheckTypeBadge = (type) => {
    switch (type) {
      case 'HISTORICAL_ANOMALY':
        return { label: 'Statistical Outlier (MAD)', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.12)' };
      case 'DATA_QUALITY_RULE':
        return { label: 'Data Quality Rule', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)' };
      case 'COMPLETENESS':
        return { label: 'Missing / Draft Entry', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' };
      default:
        return { label: type, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' };
    }
  };

  return (
    <section style={styles.sectionCard}>
      {/* Header */}
      <div style={styles.sectionHeader}>
        <div>
          <div style={styles.badgeRow}>
            <span style={styles.stageBadge}>Stage 9 Verified</span>
            <span style={styles.engineBadge}>Statistical Anomaly Engine (Median / MAD)</span>
          </div>
          <h3 style={styles.sectionTitle}>
            🛡️ Automated Anomaly Detection & Data Quality Validation
          </h3>
          <p style={styles.sectionSubtitle}>
            Continuous monitoring of reported KPI values for statistical deviations (Modified Z-Score &ge; 2.5),
            percentage boundary overruns, scale mismatches, and submission gaps.
          </p>
        </div>

        <button
          onClick={fetchQualityData}
          style={styles.refreshBtn}
          title="Re-run quality diagnostics"
        >
          🔄 Re-run Diagnostics
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>
          <div className="spinner" style={styles.spinner} />
          <p>Running statistical anomaly scans & validation rules...</p>
        </div>
      ) : error ? (
        <div style={styles.errorBox}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      ) : (
        <>
          {/* Diagnostic KPI Metrics Grid */}
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Data Integrity Score</div>
              <div style={{
                ...styles.metricValue,
                color: summary?.data_integrity_score !== null && summary?.data_integrity_score !== undefined
                  ? (summary.data_integrity_score >= 80 ? '#34d399' : '#f87171')
                  : '#94a3b8'
              }}>
                {summary?.data_integrity_score !== null && summary?.data_integrity_score !== undefined
                  ? `${summary.data_integrity_score}%`
                  : 'N/A'}
              </div>
              <div style={styles.metricSub}>
                {summary?.total_submissions_evaluated > 0
                  ? `${summary?.clean_submissions_count || 0} of ${summary?.total_submissions_evaluated} submissions verified clean`
                  : 'No submissions evaluated in this period'}
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Total Diagnostic Alerts</div>
              <div style={{ ...styles.metricValue, color: summary?.total_alerts > 0 ? '#fbbf24' : '#34d399' }}>
                {summary?.total_alerts || 0}
              </div>
              <div style={styles.metricSub}>
                Across {summary?.affected_departments_count || 0} affected department(s)
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>High Severity Outliers</div>
              <div style={{ ...styles.metricValue, color: summary?.high_severity_count > 0 ? '#f87171' : '#94a3b8' }}>
                {summary?.high_severity_count || 0}
              </div>
              <div style={styles.metricSub}>
                Requires immediate verification
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Active KPIs Audited</div>
              <div style={{ ...styles.metricValue, color: '#38bdf8' }}>
                {summary?.total_active_kpis || 0}
              </div>
              <div style={styles.metricSub}>
                Min. history requirement: {summary?.min_history_requirement || 3} periods
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={styles.filterToolbar}>
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Severity:</span>
              <button
                onClick={() => setSeverityFilter('ALL')}
                style={{
                  ...styles.filterBtn,
                  ...(severityFilter === 'ALL' ? styles.filterBtnActive : {}),
                }}
              >
                All ({allAlerts.length})
              </button>
              <button
                onClick={() => setSeverityFilter('HIGH')}
                style={{
                  ...styles.filterBtn,
                  ...(severityFilter === 'HIGH' ? styles.filterBtnActiveRed : {}),
                }}
              >
                High ({summary?.high_severity_count || 0})
              </button>
              <button
                onClick={() => setSeverityFilter('MEDIUM')}
                style={{
                  ...styles.filterBtn,
                  ...(severityFilter === 'MEDIUM' ? styles.filterBtnActiveYellow : {}),
                }}
              >
                Medium ({summary?.medium_severity_count || 0})
              </button>
            </div>

            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Category:</span>
              <select
                value={checkTypeFilter}
                onChange={(e) => setCheckTypeFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="ALL">All Categories</option>
                <option value="HISTORICAL_ANOMALY">Statistical Outliers (MAD)</option>
                <option value="DATA_QUALITY_RULE">Data Quality Rules</option>
                <option value="COMPLETENESS">Missing / Draft Submissions</option>
              </select>

              {uniqueDepts.length > 1 && (
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="ALL">All Departments</option>
                  {uniqueDepts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Alerts Content */}
          {filteredAlerts.length === 0 ? (
            <div style={styles.emptyCard}>
              <span style={styles.emptyIcon}>✅</span>
              <h4 style={styles.emptyTitle}>All Performance Submissions Verified Clean</h4>
              <p style={styles.emptyText}>
                No statistical anomalies, boundary violations, or data quality rule alerts were detected
                for reporting period {selectedYear}-{String(selectedMonth).padStart(2, '0')}.
              </p>
            </div>
          ) : (
            <div style={styles.alertList}>
              {filteredAlerts.map((alert) => {
                const sevStyle = getSeverityStyle(alert.severity);
                const typeBadge = getCheckTypeBadge(alert.check_type);

                return (
                  <div
                    key={alert.id}
                    style={{
                      ...styles.alertCard,
                      borderLeft: `4px solid ${sevStyle.color}`,
                    }}
                  >
                    {/* Header Row */}
                    <div style={styles.alertHeaderRow}>
                      <div style={styles.alertBadges}>
                        <span
                          style={{
                            ...styles.pillBadge,
                            background: sevStyle.bg,
                            border: sevStyle.border,
                            color: sevStyle.color,
                          }}
                        >
                          {sevStyle.label}
                        </span>
                        <span
                          style={{
                            ...styles.pillBadge,
                            background: typeBadge.bg,
                            color: typeBadge.color,
                          }}
                        >
                          {typeBadge.label}
                        </span>
                        <span style={styles.deptPill}>
                          <strong>[{alert.department_code}]</strong> {alert.department_name}
                        </span>
                      </div>

                      <span style={styles.periodPill}>
                        Period: {alert.period_year}-{String(alert.period_month).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Metric Information */}
                    <div style={styles.metricInfoRow}>
                      <div>
                        <h4 style={styles.kpiNameTitle}>{alert.kpi_name}</h4>
                        <div style={styles.metricDetailsText}>
                          Target Benchmark:{' '}
                          <strong>
                            {alert.benchmark_target} {alert.kpi_unit}
                          </strong>
                        </div>
                      </div>

                      <div style={styles.observedBox}>
                        <span style={styles.observedLabel}>Observed Value</span>
                        <span
                          style={{
                            ...styles.observedValueText,
                            color: alert.direction === 'PLUMMET' ? '#f87171' : alert.direction === 'SURGE' ? '#38bdf8' : '#fbbf24',
                          }}
                        >
                          {alert.observed_value !== null ? `${alert.observed_value} ${alert.kpi_unit}` : 'Not Submitted'}
                          {alert.direction === 'PLUMMET' && ' 📉 (Plummet)'}
                          {alert.direction === 'SURGE' && ' 📈 (Surge)'}
                        </span>
                      </div>
                    </div>

                    {/* Historical Baseline Metadata (if applicable) */}
                    {alert.historical_baseline && (
                      <div style={styles.baselineBox}>
                        <span style={styles.baselineIcon}>📊</span>
                        <div style={styles.baselineText}>
                          <strong>Historical Baseline (n={alert.historical_baseline.sample_size} periods):</strong>{' '}
                          Median = {alert.historical_baseline.median} {alert.kpi_unit} | MAD ={' '}
                          {alert.historical_baseline.mad} |{' '}
                          <span style={{ color: '#fbbf24', fontWeight: '700' }}>
                            Modified Z-Score = {alert.historical_baseline.modified_z_score}
                          </span>
                          {alert.historical_baseline.is_zero_variance && ' (Zero Historical Variance Handled)'}
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    <div style={styles.explanationText}>
                      <strong>Diagnostic Finding:</strong> {alert.explanation}
                    </div>

                    {/* Suggested Action */}
                    {alert.suggested_action && (
                      <div style={styles.actionBox}>
                        <span style={{ fontSize: '1rem' }}>💡</span>
                        <span style={styles.actionText}>
                          <strong>Recommended Verification:</strong> {alert.suggested_action}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Non-fraud disclaimer */}
          <div style={styles.disclaimerBox}>
            <span>ℹ️</span>
            <span>{data?.disclaimer}</span>
          </div>
        </>
      )}
    </section>
  );
};

const styles = {
  sectionCard: {
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
    border: '1px solid rgba(139, 92, 246, 0.25)',
    borderRadius: '16px',
    padding: '1.75rem',
    marginTop: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  badgeRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.4rem',
  },
  stageBadge: {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#a78bfa',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '4px',
    padding: '0.15rem 0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  engineBadge: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.1)',
    borderRadius: '4px',
    padding: '0.15rem 0.5rem',
  },
  sectionTitle: {
    fontSize: '1.35rem',
    fontWeight: '800',
    margin: '0.2rem 0',
    color: '#f8fafc',
  },
  sectionSubtitle: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    margin: 0,
    maxWidth: '850px',
    lineHeight: '1.4',
  },
  refreshBtn: {
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    color: '#c4b5fd',
    borderRadius: '8px',
    padding: '0.5rem 0.85rem',
    fontSize: '0.82rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#94a3b8',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#a78bfa',
    borderRadius: '50%',
    margin: '0 auto 1rem auto',
    animation: 'spin 1s linear infinite',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '1rem',
    color: '#fca5a5',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  metricCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1.1rem',
  },
  metricLabel: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px',
    marginBottom: '0.35rem',
  },
  metricValue: {
    fontSize: '1.75rem',
    fontWeight: '800',
    lineHeight: '1.1',
  },
  metricSub: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.35rem',
  },
  filterToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    background: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    marginBottom: '1.25rem',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#94a3b8',
    marginRight: '0.25rem',
  },
  filterBtn: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    borderRadius: '6px',
    padding: '0.3rem 0.65rem',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  filterBtnActive: {
    background: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    color: '#fff',
  },
  filterBtnActiveRed: {
    background: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#ef4444',
    color: '#fca5a5',
  },
  filterBtnActiveYellow: {
    background: 'rgba(245, 158, 11, 0.25)',
    borderColor: '#f59e0b',
    color: '#fde68a',
  },
  filterSelect: {
    background: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    color: '#f8fafc',
    padding: '0.35rem 0.65rem',
    fontSize: '0.8rem',
  },
  emptyCard: {
    textAlign: 'center',
    padding: '3rem 2rem',
    background: 'rgba(16, 185, 129, 0.04)',
    border: '1px dashed rgba(16, 185, 129, 0.25)',
    borderRadius: '12px',
    color: '#94a3b8',
  },
  emptyIcon: {
    fontSize: '2.5rem',
    display: 'block',
    marginBottom: '0.75rem',
  },
  emptyTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: '#34d399',
    margin: '0 0 0.5rem 0',
  },
  emptyText: {
    fontSize: '0.88rem',
    color: '#94a3b8',
    maxWidth: '550px',
    margin: '0 auto',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  alertCard: {
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1.25rem',
    transition: 'all 0.2s',
  },
  alertHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '0.85rem',
  },
  alertBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  pillBadge: {
    fontSize: '0.72rem',
    fontWeight: '800',
    padding: '0.2rem 0.55rem',
    borderRadius: '4px',
    letterSpacing: '0.3px',
  },
  deptPill: {
    fontSize: '0.82rem',
    color: '#f8fafc',
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
  },
  periodPill: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: '600',
  },
  metricInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '0.75rem',
  },
  kpiNameTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#f1f5f9',
    margin: '0 0 0.25rem 0',
  },
  metricDetailsText: {
    fontSize: '0.82rem',
    color: '#94a3b8',
  },
  observedBox: {
    textAlign: 'right',
  },
  observedLabel: {
    fontSize: '0.72rem',
    color: '#94a3b8',
    display: 'block',
    textTransform: 'uppercase',
  },
  observedValueText: {
    fontSize: '1.15rem',
    fontWeight: '800',
  },
  baselineBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(139, 92, 246, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '6px',
    padding: '0.4rem 0.75rem',
    marginBottom: '0.75rem',
    fontSize: '0.78rem',
    color: '#c4b5fd',
  },
  baselineIcon: {
    fontSize: '0.9rem',
  },
  baselineText: {
    lineHeight: '1.3',
  },
  explanationText: {
    fontSize: '0.86rem',
    color: '#cbd5e1',
    lineHeight: '1.45',
    marginBottom: '0.75rem',
  },
  actionBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
    padding: '0.6rem 0.85rem',
  },
  actionText: {
    fontSize: '0.82rem',
    color: '#6ee7b7',
    lineHeight: '1.4',
  },
  disclaimerBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '8px',
    fontSize: '0.78rem',
    color: '#64748b',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
};

export default AnomalyMonitoringSection;
