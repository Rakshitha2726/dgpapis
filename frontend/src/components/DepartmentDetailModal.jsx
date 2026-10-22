import React, { useEffect, useState } from 'react';
import departmentService from '../services/departmentService';

const DepartmentDetailModal = ({ isOpen, onClose, departmentId }) => {
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && departmentId) {
      setLoading(true);
      setError(null);
      departmentService
        .getDepartmentById(departmentId)
        .then((data) => {
          setDepartment(data.department);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Failed to fetch department details.');
          setLoading(false);
        });
    }
  }, [isOpen, departmentId]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={styles.icon}>🏛️</span>
            <div>
              <h2 style={styles.title}>
                {department ? `${department.name} (${department.code})` : 'Department Info'}
              </h2>
              <span style={styles.subtitle}>Basic Department Information & Assigned Assets</span>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <p>Loading Department Metadata...</p>
          </div>
        ) : error ? (
          <div style={styles.errorAlert}>{error}</div>
        ) : department ? (
          <div style={styles.content}>
            <div style={styles.badgeRow}>
              <span style={department.is_active ? styles.activeBadge : styles.inactiveBadge}>
                {department.is_active ? '● Active Department' : '○ Deactivated'}
              </span>
              <span style={styles.idBadge}>ID: #{department.id}</span>
              <span style={styles.codeBadge}>{department.code}</span>
            </div>

            <div style={styles.infoSection}>
              <h4 style={styles.sectionTitle}>Mandate & Description</h4>
              <p style={styles.descText}>
                {department.description || 'No description provided for this department.'}
              </p>
            </div>

            <div style={styles.grid}>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{department.user_count}</div>
                <div style={styles.statLabel}>Assigned Officers</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{department.kpi_count}</div>
                <div style={styles.statLabel}>Configured KPIs</div>
              </div>
            </div>

            {department.users && department.users.length > 0 && (
              <div style={styles.infoSection}>
                <h4 style={styles.sectionTitle}>Assigned Officers</h4>
                <div style={styles.list}>
                  {department.users.map((u) => (
                    <div key={u.id} style={styles.listItem}>
                      <div>
                        <strong>{u.name}</strong> <small style={{ color: '#94a3b8' }}>({u.email})</small>
                      </div>
                      <span style={styles.roleTag}>{u.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {department.kpis && department.kpis.length > 0 && (
              <div style={styles.infoSection}>
                <h4 style={styles.sectionTitle}>Department KPIs</h4>
                <div style={styles.list}>
                  {department.kpis.map((k) => (
                    <div key={k.id} style={styles.listItem}>
                      <div>
                        <strong>{k.name}</strong> <small style={{ color: '#94a3b8' }}>({k.unit} — Target: {k.target_value})</small>
                      </div>
                      <span style={styles.categoryTag}>{k.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.footer}>
              <button onClick={onClose} style={styles.closeModalBtn}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modalCard: {
    width: '100%',
    maxWidth: '560px',
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
    padding: '1.75rem',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
    color: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.25rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  icon: {
    fontSize: '2rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '800',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.25rem',
    cursor: 'pointer',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '2rem',
    color: '#94a3b8',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#fca5a5',
    padding: '1rem',
    borderRadius: '8px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  badgeRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  activeBadge: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '12px',
    padding: '0.2rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  inactiveBadge: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '0.2rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  idBadge: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#cbd5e1',
    borderRadius: '12px',
    padding: '0.2rem 0.6rem',
    fontSize: '0.75rem',
  },
  codeBadge: {
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    borderRadius: '12px',
    padding: '0.2rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  infoSection: {
    background: 'rgba(15, 23, 42, 0.5)',
    padding: '1rem',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#94a3b8',
    margin: '0 0 0.5rem 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  descText: {
    fontSize: '0.9rem',
    color: '#e2e8f0',
    lineHeight: '1.5',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  statBox: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '1rem',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#38bdf8',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.82rem',
  },
  roleTag: {
    fontSize: '0.7rem',
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.1)',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
  },
  categoryTag: {
    fontSize: '0.7rem',
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '1rem',
  },
  closeModalBtn: {
    padding: '0.6rem 1.2rem',
    background: '#0284c7',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    cursor: 'pointer',
  },
};

export default DepartmentDetailModal;
