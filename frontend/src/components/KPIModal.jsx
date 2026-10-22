import React, { useState, useEffect } from 'react';
import kpiService from '../services/kpiService';

const KPI_CATEGORIES = [
  { id: 'financial', label: '💰 Financial' },
  { id: 'service_delivery', label: '🤝 Service Delivery' },
  { id: 'operational_efficiency', label: '⚡ Operational Efficiency' },
  { id: 'human_resources', label: '👥 Human Resources' },
  { id: 'infrastructure', label: '🏗️ Infrastructure' },
  { id: 'compliance', label: '📋 Compliance & Audit' },
];

const KPIModal = ({ isOpen, onClose, kpi, departments, defaultDepartmentId, onSaveSuccess }) => {
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [unit, setUnit] = useState('%');
  const [targetValue, setTargetValue] = useState('90');
  const [weight, setWeight] = useState('20');
  const [higherIsBetter, setHigherIsBetter] = useState(true);
  const [category, setCategory] = useState('operational_efficiency');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState(null);

  const isEditMode = !!kpi;

  useEffect(() => {
    if (kpi) {
      setName(kpi.name || '');
      setDepartmentId(kpi.department_id || '');
      setUnit(kpi.unit || '%');
      setTargetValue(kpi.target_value !== undefined ? kpi.target_value : '90');
      setWeight(kpi.weight !== undefined ? kpi.weight : '20');
      setHigherIsBetter(kpi.higher_is_better !== undefined ? kpi.higher_is_better : true);
      setCategory(kpi.category || 'operational_efficiency');
      setDescription(kpi.description || '');
      setIsActive(kpi.is_active !== undefined ? kpi.is_active : true);
    } else {
      setName('');
      setDepartmentId(defaultDepartmentId || (departments[0]?.id || ''));
      setUnit('%');
      setTargetValue('90');
      setWeight('20');
      setHigherIsBetter(true);
      setCategory('operational_efficiency');
      setDescription('');
      setIsActive(true);
    }
    setErrorAlert(null);
  }, [kpi, isOpen, defaultDepartmentId, departments]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorAlert(null);

    if (!departmentId) {
      setErrorAlert('Please select a department.');
      return;
    }

    if (!name.trim() || name.trim().length < 3) {
      setErrorAlert('KPI name must be at least 3 characters.');
      return;
    }

    const numericWeight = parseInt(weight, 10);
    if (isNaN(numericWeight) || numericWeight < 1 || numericWeight > 100) {
      setErrorAlert('Weight must be an integer between 1% and 100%.');
      return;
    }

    const numericTarget = parseFloat(targetValue);
    if (isNaN(numericTarget) || numericTarget < 0) {
      setErrorAlert('Target value must be a valid non-negative number.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        department_id: parseInt(departmentId, 10),
        unit: unit.trim(),
        target_value: numericTarget,
        weight: numericWeight,
        higher_is_better: higherIsBetter,
        category,
        description: description.trim() || null,
        is_active: isActive,
      };

      if (isEditMode) {
        await kpiService.updateKPI(kpi.id, payload);
      } else {
        await kpiService.createKPI(payload);
      }

      setLoading(false);
      onSaveSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : 'Failed to save KPI.');
      setErrorAlert(msg);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isEditMode ? '✏️ Edit Key Performance Indicator' : '🎯 Add New KPI'}
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.noticeBox}>
          <span>ℹ️</span>
          <div>
            <strong>Illustrative Research-Paper Weighting:</strong> Weights (e.g., 30%, 25%, 20%, 15%, 10%) are illustrative project metrics for academic evaluation, not official government standards. Total active weight per department must not exceed 100%.
          </div>
        </div>

        {errorAlert && (
          <div style={styles.errorAlert}>
            <span>⚠️</span>
            <div>{errorAlert}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Assigned Department *</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              style={styles.select}
              required
              disabled={isEditMode}
            >
              <option value="">-- Select Department --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>KPI Indicator Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Complaint Resolution Rate, Budget Utilization..."
              maxLength={200}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Target Benchmark Value *</label>
              <input
                type="number"
                step="any"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g. 90.00"
                style={styles.input}
                required
              />
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Measurement Unit *</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%, days, score, count"
                maxLength={30}
                style={styles.input}
                required
              />
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Relative Weight (%) *</label>
              <input
                type="number"
                min="1"
                max="100"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 30"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Performance Direction Rule *</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioOption}>
                <input
                  type="radio"
                  name="higher_is_better"
                  checked={higherIsBetter === true}
                  onChange={() => setHigherIsBetter(true)}
                  style={{ accentColor: '#10b981' }}
                />
                <span><strong>Higher is Better ↑</strong> (e.g. Target Achievement %, Satisfaction Score)</span>
              </label>

              <label style={styles.radioOption}>
                <input
                  type="radio"
                  name="higher_is_better"
                  checked={higherIsBetter === false}
                  onChange={() => setHigherIsBetter(false)}
                  style={{ accentColor: '#38bdf8' }}
                />
                <span><strong>Lower is Better ↓</strong> (e.g. Processing Days, Complaint Resolution Time)</span>
              </label>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>KPI Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={styles.select}
              required
            >
              {KPI_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Detailed Measurement Notes / Method</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How this indicator is collected and calculated..."
              rows={2}
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
              <span>Active KPI (Only active KPI weights consume department weight allocation capacity)</span>
            </label>
          </div>

          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={styles.saveBtn}>
              {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create KPI'}
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
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modalCard: {
    width: '100%',
    maxWidth: '580px',
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
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.25rem',
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
  noticeBox: {
    display: 'flex',
    gap: '0.6rem',
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    color: '#7dd3fc',
    padding: '0.75rem',
    borderRadius: '10px',
    fontSize: '0.78rem',
    lineHeight: '1.45',
    marginBottom: '1.25rem',
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
  row: {
    display: 'flex',
    gap: '0.75rem',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  input: {
    width: '100%',
    padding: '0.65rem 0.85rem',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '0.65rem 0.85rem',
    background: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    background: 'rgba(15, 23, 42, 0.4)',
    padding: '0.6rem 0.8rem',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    color: '#cbd5e1',
    cursor: 'pointer',
  },
  checkboxGroup: {
    marginTop: '0.3rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
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
    marginTop: '1.25rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  cancelBtn: {
    padding: '0.6rem 1.25rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#94a3b8',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  saveBtn: {
    padding: '0.6rem 1.25rem',
    background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
    border: 'none',
    color: '#ffffff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
  },
};

export default KPIModal;
