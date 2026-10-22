import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import departmentService from '../services/departmentService';
import DepartmentModal from '../components/DepartmentModal';
import DepartmentDetailModal from '../components/DepartmentDetailModal';

const DepartmentManagementPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailDepartmentId, setDetailDepartmentId] = useState(null);

  const loadDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await departmentService.getAllDepartments({
        search: searchTerm,
        includeInactive: includeInactive ? 'true' : 'false',
      });
      setDepartments(data.departments || []);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load departments.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [searchTerm, includeInactive]);

  const showNotification = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleOpenAddModal = () => {
    setSelectedDepartment(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (dept) => {
    setSelectedDepartment(dept);
    setIsEditModalOpen(true);
  };

  const handleOpenDetailModal = (deptId) => {
    setDetailDepartmentId(deptId);
    setIsDetailModalOpen(true);
  };

  const handleDeactivate = async (dept) => {
    if (
      window.confirm(
        `Are you sure you want to deactivate '${dept.name}' (${dept.code})?\n\nDeactivating sets is_active = false while keeping historical performance data intact.`
      )
    ) {
      try {
        await departmentService.deactivateDepartment(dept.id);
        showNotification(`Department '${dept.name}' deactivated successfully.`);
        loadDepartments();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to deactivate department.');
      }
    }
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <main style={styles.container}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>🏛️ Department Management</h1>
            <p style={styles.pageSubtitle}>
              Create, configure, and manage government departments for KPI assessment.
            </p>
          </div>
          <button onClick={handleOpenAddModal} style={styles.addBtn}>
            ➕ Add Department
          </button>
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

        {/* Filter Bar */}
        <div style={styles.filterCard}>
          <div style={styles.searchBox}>
            <span style={{ fontSize: '1rem', color: '#94a3b8' }}>🔍</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search departments by name, code, or description..."
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
            <span>Show Deactivated Departments</span>
          </label>
        </div>

        {/* Department Grid */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div className="spinner" style={styles.spinner} />
            <p>Loading Departments...</p>
          </div>
        ) : departments.length === 0 ? (
          <div style={styles.emptyContainer}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏛️</div>
            <h3>No Departments Found</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              {searchTerm ? 'No departments matched your search query.' : 'Click "Add Department" to create the first department.'}
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {departments.map((dept) => (
              <div
                key={dept.id}
                style={{
                  ...styles.card,
                  opacity: dept.is_active ? 1 : 0.75,
                }}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.codeBadge}>{dept.code}</span>
                  <span style={dept.is_active ? styles.statusActive : styles.statusInactive}>
                    {dept.is_active ? '● Active' : '○ Deactivated'}
                  </span>
                </div>

                <h3 style={styles.deptName}>{dept.name}</h3>

                <p style={styles.deptDesc}>
                  {dept.description
                    ? dept.description.length > 90
                      ? `${dept.description.substring(0, 90)}...`
                      : dept.description
                    : 'No description statement provided.'}
                </p>

                <div style={styles.statsRow}>
                  <div style={styles.statBadge}>
                    👥 <strong>{dept.user_count}</strong> Officers
                  </div>
                  <div style={styles.statBadge}>
                    🎯 <strong>{dept.kpi_count}</strong> KPIs
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  <button
                    onClick={() => handleOpenDetailModal(dept.id)}
                    style={styles.actionBtnInfo}
                    title="View Information"
                  >
                    ℹ️ Info
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(dept)}
                    style={styles.actionBtnEdit}
                    title="Edit Department"
                  >
                    ✏️ Edit
                  </button>
                  {dept.is_active && (
                    <button
                      onClick={() => handleDeactivate(dept)}
                      style={styles.actionBtnDeactivate}
                      title="Deactivate Department"
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

      {/* Add / Edit Department Modal */}
      <DepartmentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        department={selectedDepartment}
        onSaveSuccess={() => {
          showNotification(
            selectedDepartment
              ? `Department '${selectedDepartment.name}' updated successfully.`
              : 'New department created successfully.'
          );
          loadDepartments();
        }}
      />

      {/* Department Information Detail Modal */}
      <DepartmentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        departmentId={detailDepartmentId}
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
    marginBottom: '1.5rem',
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
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.5rem 0.85rem',
    flex: 1,
    minWidth: '260px',
  },
  searchInput: {
    background: 'none',
    border: 'none',
    color: '#f8fafc',
    fontSize: '0.9rem',
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
    userSelect: 'none',
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
    marginBottom: '0.75rem',
  },
  codeBadge: {
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '8px',
    padding: '0.2rem 0.65rem',
    fontWeight: '800',
    fontSize: '0.8rem',
    letterSpacing: '0.5px',
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
  deptName: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 0.5rem 0',
  },
  deptDesc: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    lineHeight: '1.45',
    margin: '0 0 1.25rem 0',
    minHeight: '2.5rem',
  },
  statsRow: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  statBadge: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.78rem',
    color: '#cbd5e1',
  },
  cardFooter: {
    display: 'flex',
    gap: '0.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  actionBtnInfo: {
    flex: 1,
    padding: '0.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  actionBtnEdit: {
    flex: 1,
    padding: '0.5rem',
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
    padding: '0.5rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#f87171',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
};

export default DepartmentManagementPage;
