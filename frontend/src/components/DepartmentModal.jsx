import React, { useState, useEffect } from 'react';
import departmentService from '../services/departmentService';

const DepartmentModal = ({ isOpen, onClose, department, onSaveSuccess }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState(null);

  const isEditMode = !!department;

  useEffect(() => {
    if (department) {
      setName(department.name || '');
      setCode(department.code || '');
      setDescription(department.description || '');
      setIsActive(department.is_active !== undefined ? department.is_active : true);
    } else {
      setName('');
      setCode('');
      setDescription('');
      setIsActive(true);
    }
    setErrorAlert(null);
  }, [department, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorAlert(null);

    if (!name.trim() || name.trim().length < 3) {
      setErrorAlert('Department name must be at least 3 characters.');
      return;
    }

    if (!code.trim() || code.trim().length < 2) {
      setErrorAlert('Department code must be at least 2 characters (e.g., MOF).');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        is_active: isActive,
      };

      if (isEditMode) {
        await departmentService.updateDepartment(department.id, payload);
      } else {
        await departmentService.createDepartment(payload);
      }

      setLoading(false);
      onSaveSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : 'Failed to save department.');
      setErrorAlert(msg);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isEditMode ? '✏️ Edit Department' : '🏛️ Add New Department'}
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {errorAlert && (
          <div style={styles.errorAlert}>
            <span>⚠️</span>
            <div>{errorAlert}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Department Code *</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. MOF, MOH, MOE"
              maxLength={10}
              style={styles.input}
              required
            />
            <small style={styles.hint}>Short 2–10 character uppercase code</small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Department Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ministry of Finance"
              maxLength={150}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description / Mandate Statement</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Overview of the department's core responsibilities and governance goals..."
              rows={3}
              style={{ ...styles.input, resize: 'vertical' }}
            />
          </div>

          <div style={styles.checkboxGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={styles.checkbox}
              />
              <span>Active Status (Active departments can receive performance data submissions)</span>
            </label>
          </div>

          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={styles.saveBtn}>
              {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
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
    maxWidth: '520px',
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
    padding: '1.75rem',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
    color: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: '800',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.25rem',
    cursor: 'pointer',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  input: {
    width: '100%',
    padding: '0.7rem 0.9rem',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '0.72rem',
    color: '#64748b',
  },
  checkboxGroup: {
    marginTop: '0.5rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.82rem',
    color: '#cbd5e1',
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: '#0284c7',
    width: '16px',
    height: '16px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  cancelBtn: {
    padding: '0.65rem 1.25rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#94a3b8',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  saveBtn: {
    padding: '0.65rem 1.25rem',
    background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
    border: 'none',
    color: '#ffffff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
  },
};

export default DepartmentModal;
