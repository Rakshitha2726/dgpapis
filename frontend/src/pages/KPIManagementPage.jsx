import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import kpiService from '../services/kpiService';
import departmentService from '../services/departmentService';
import KPIModal from '../components/KPIModal';

const KPIManagementPage = () => {
  const [kpis, setKpis] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [weightSummary, setWeightSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [presetLoading, setPresetLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState(null);

  // Load Departments on mount
  useEffect(() => {
    departmentService
      .getAllDepartments({ includeInactive: 'true' })
      .then((data) => {
        const depts = data.departments || [];
        setDepartments(depts);
        if (depts.length > 0 && !selectedDepartmentId) {
          setSelectedDepartmentId(depts[0].id.toString());
        }
      })
      .catch((err) => console.error('Failed to fetch departments:', err));
  }, []);

  const loadKpisAndWeightSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        includeInactive: includeInactive ? 'true' : 'false',
        search: searchTerm,
      };

      if (selectedDepartmentId) {
        params.department_id = selectedDepartmentId;
      }

      if (categoryFilter) {
        params.category = categoryFilter;
      }

      const data = await kpiService.getAllKPIs(params);
      setKpis(data.kpis || []);

      if (selectedDepartmentId) {
        const summaryData = await kpiService.getDepartmentWeightSummary(selectedDepartmentId);
        setWeightSummary(summaryData.weight_summary || null);
      } else {
        setWeightSummary(null);
      }

      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load KPIs.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKpisAndWeightSummary();
  }, [selectedDepartmentId, categoryFilter, includeInactive, searchTerm]);

  const showNotification = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const handleOpenAddModal = () => {
    setSelectedKpi(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (kpi) => {
    setSelectedKpi(kpi);
    setIsModalOpen(true);
  };

  const handleDeactivate = async (kpiItem) => {
    if (
      window.confirm(
        `Are you sure you want to deactivate '${kpiItem.name}'?\n\nDeactivating sets is_active = false while keeping historical performance records intact. Released active weight: ${kpiItem.weight}%.`
      )
    ) {
      try {
        const res = await kpiService.deactivateKPI(kpiItem.id);
        showNotification(res.message);
        loadKpisAndWeightSummary();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to deactivate KPI.');
      }
    }
  };

  const handleApplyIllustrativePresets = async () => {
    if (!selectedDepartmentId) {
      alert('Please select a department first.');
      return;
    }

    const targetDept = departments.find((d) => d.id.toString() === selectedDepartmentId.toString());
    const deptName = targetDept ? targetDept.name : 'selected department';

    if (
      window.confirm(
        `Apply illustrative research-paper KPI presets to ${deptName}?\n\nPresets:\n• Target Achievement (30%)\n• Complaint Resolution (25%)\n• Citizen Satisfaction (20%)\n• Service Quality (15%)\n• Budget Utilization (10%)\n\nNote: Duplicate KPIs will be automatically skipped to prevent copies.`
      )
    ) {
      setPresetLoading(true);
      try {
        const res = await kpiService.applyIllustrativePresets(selectedDepartmentId);
        setPresetLoading(false);
        showNotification(res.message);
        loadKpisAndWeightSummary();
      } catch (err) {
        setPresetLoading(false);
        setError(err.response?.data?.message || 'Failed to apply presets.');
      }
    }
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <main style={styles.container}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>🎯 KPI Management</h1>
            <p style={styles.pageSubtitle}>
              Define, assign, and manage Key Performance Indicators for government departments.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleApplyIllustrativePresets}
              disabled={presetLoading || !selectedDepartmentId}
              style={styles.presetBtn}
              title="Auto-fill missing illustrative research presets"
            >
              {presetLoading ? 'Applying...' : '📑 Apply Research Presets'}
            </button>

            <button onClick={handleOpenAddModal} style={styles.addBtn}>
              ➕ Add KPI
            </button>
          </div>
        </div>

        {/* Illustrative Project Notice Banner */}
        <div style={styles.illustrativeNoticeBar}>
          <span style={{ fontSize: '1.2rem' }}>🧪</span>
          <div>
            <strong>Illustrative Research-Paper Weighting Scheme:</strong> Presets (*Target Achievement 30%*, *Complaint Resolution 25%*, *Citizen Satisfaction 20%*, *Service Quality 15%*, *Budget Utilization 10%*) represent illustrative project evaluation metrics from the CSE research design, not official government standards.
          </div>
        </div>

        {successToast && (
          <div style={styles.successToast}>
            <span>✅</span>
            <div>{successToast}</div>
          </div>
        )}

        {error && (
          <div style={styles.errorAlert}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {/* Department Weight Summary Bar */}
        {selectedDepartmentId && weightSummary && (
          <div style={styles.weightCard}>
            <div style={styles.weightHeader}>
              <div>
                <span style={styles.weightTitle}>
                  ⚖️ Weight Allocation Summary —{' '}
                  {departments.find((d) => d.id.toString() === selectedDepartmentId.toString())?.name}
                </span>
                <span style={styles.weightSubtext}>
                  Total active KPI weight: <strong>{weightSummary.total_active_weight}%</strong> / 100%
                </span>
              </div>

              <div>
                {weightSummary.is_fully_allocated ? (
                  <span style={styles.badgeBalanced}>✅ 100% Balanced</span>
                ) : weightSummary.is_over_allocated ? (
                  <span style={styles.badgeOver}>⚠️ Over-allocated</span>
                ) : (
                  <span style={styles.badgeUnder}>
                    ⚡ {weightSummary.remaining_weight}% Available Capacity
                  </span>
                )}
              </div>
            </div>

            {/* Progress Meter Bar */}
            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressBar,
                  width: `${Math.min(100, weightSummary.total_active_weight)}%`,
                  background:
                    weightSummary.total_active_weight === 100
                      ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                      : weightSummary.total_active_weight > 100
                      ? '#ef4444'
                      : 'linear-gradient(90deg, #0284c7 0%, #6366f1 100%)',
                }}
              />
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div style={styles.filterCard}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Department Filter:</label>
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              style={styles.selectInput}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.searchBox}>
            <span style={{ color: '#94a3b8' }}>🔍</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search KPIs by name, unit, description..."
              style={styles.searchInput}
            />
          </div>

          <label style={styles.filterCheckbox}>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              style={{ accentColor: '#0284c7' }}
            />
            <span>Show Deactivated KPIs</span>
          </label>
        </div>

        {/* KPI Grid */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div className="spinner" style={styles.spinner} />
            <p>Loading Key Performance Indicators...</p>
          </div>
        ) : kpis.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎯</div>
            <h3>No KPIs Found</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              {searchTerm ? 'No KPIs matched your search query.' : 'Click "Add KPI" or "Apply Research Presets" to define indicators.'}
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {kpis.map((kpiItem) => (
              <div
                key={kpiItem.id}
                style={{
                  ...styles.card,
                  opacity: kpiItem.is_active ? 1 : 0.75,
                }}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.deptTag}>
                    {kpiItem.department ? kpiItem.department.code : `Dept #${kpiItem.department_id}`}
                  </span>
                  <span style={kpiItem.is_active ? styles.statusActive : styles.statusInactive}>
                    {kpiItem.is_active ? '● Active' : '○ Deactivated'}
                  </span>
                </div>

                <h3 style={styles.kpiName}>{kpiItem.name}</h3>

                <div style={styles.metricRow}>
                  <div style={styles.targetMetric}>
                    <small style={styles.metricLabel}>Target Goal</small>
                    <span style={styles.metricValue}>
                      {kpiItem.target_value} <small style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{kpiItem.unit}</small>
                    </span>
                  </div>

                  <div style={styles.weightMetric}>
                    <small style={styles.metricLabel}>Weight Share</small>
                    <span style={styles.weightBadge}>{kpiItem.weight}%</span>
                  </div>
                </div>

                <div style={styles.directionRow}>
                  {kpiItem.higher_is_better ? (
                    <span style={styles.directionHigher}>Higher is Better ↑</span>
                  ) : (
                    <span style={styles.directionLower}>Lower is Better ↓</span>
                  )}
                  <span style={styles.categoryTag}>{kpiItem.category}</span>
                </div>

                <p style={styles.kpiDesc}>
                  {kpiItem.description
                    ? kpiItem.description.length > 85
                      ? `${kpiItem.description.substring(0, 85)}...`
                      : kpiItem.description
                    : 'No description notes provided.'}
                </p>

                <div style={styles.cardFooter}>
                  <button
                    onClick={() => handleOpenEditModal(kpiItem)}
                    style={styles.actionBtnEdit}
                  >
                    ✏️ Edit
                  </button>
                  {kpiItem.is_active && (
                    <button
                      onClick={() => handleDeactivate(kpiItem)}
                      style={styles.actionBtnDeactivate}
                    >
                      🚫 Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* KPI Add / Edit Modal */}
      <KPIModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        kpi={selectedKpi}
        departments={departments}
        defaultDepartmentId={selectedDepartmentId}
        onSaveSuccess={() => {
          showNotification(
            selectedKpi
              ? `KPI '${selectedKpi.name}' updated successfully.`
              : 'New KPI created successfully.'
          );
          loadKpisAndWeightSummary();
        }}
      />
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
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '1rem',
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
  presetBtn: {
    padding: '0.75rem 1.1rem',
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '10px',
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  addBtn: {
    padding: '0.75rem 1.25rem',
    background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
  },
  illustrativeNoticeBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    color: '#7dd3fc',
    padding: '0.85rem 1.2rem',
    borderRadius: '12px',
    fontSize: '0.82rem',
    lineHeight: '1.45',
    marginBottom: '1.5rem',
  },
  successToast: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#6ee7b7',
    padding: '0.85rem 1.2rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    padding: '0.85rem 1.2rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  weightCard: {
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
  },
  weightHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.65rem',
  },
  weightTitle: {
    fontWeight: '700',
    fontSize: '0.95rem',
    color: '#f8fafc',
    marginRight: '0.75rem',
  },
  weightSubtext: {
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  badgeBalanced: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '700',
  },
  badgeOver: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '700',
  },
  badgeUnder: {
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: '700',
  },
  progressTrack: {
    height: '10px',
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    transition: 'width 0.4s ease',
  },
  filterCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '0.85rem 1.25rem',
    marginBottom: '2rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filterLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: '600',
  },
  selectInput: {
    background: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    color: '#f8fafc',
    padding: '0.5rem 0.85rem',
    fontSize: '0.88rem',
    outline: 'none',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.5rem 0.85rem',
    flex: 1,
    minWidth: '220px',
  },
  searchInput: {
    background: 'none',
    border: 'none',
    color: '#f8fafc',
    fontSize: '0.88rem',
    outline: 'none',
    width: '100%',
  },
  filterCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    color: '#cbd5e1',
    cursor: 'pointer',
  },
  loadingContainer: {
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
  emptyContainer: {
    textAlign: 'center',
    padding: '4rem 1rem',
    background: 'rgba(30, 41, 59, 0.4)',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.6rem',
  },
  deptTag: {
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '6px',
    padding: '0.15rem 0.5rem',
    fontWeight: '800',
    fontSize: '0.75rem',
  },
  statusActive: {
    color: '#34d399',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  statusInactive: {
    color: '#f87171',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  kpiName: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 0.85rem 0',
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.5)',
    padding: '0.75rem',
    borderRadius: '10px',
    marginBottom: '0.75rem',
  },
  targetMetric: {
    display: 'flex',
    flexDirection: 'column',
  },
  metricLabel: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#f1f5f9',
  },
  weightMetric: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  weightBadge: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#38bdf8',
  },
  directionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.85rem',
    gap: '0.5rem',
  },
  directionHigher: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid rgba(16, 185, 129, 0.25)',
  },
  directionLower: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.1)',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid rgba(56, 189, 248, 0.25)',
  },
  categoryTag: {
    fontSize: '0.7rem',
    color: '#cbd5e1',
    background: 'rgba(255, 255, 255, 0.06)',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
  },
  kpiDesc: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    lineHeight: '1.4',
    margin: '0 0 1.25rem 0',
    minHeight: '2.2rem',
  },
  cardFooter: {
    display: 'flex',
    gap: '0.5rem',
    paddingTop: '0.85rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  actionBtnEdit: {
    flex: 1,
    padding: '0.45rem',
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    color: '#38bdf8',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  actionBtnDeactivate: {
    flex: 1,
    padding: '0.45rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#f87171',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
};

export default KPIManagementPage;
