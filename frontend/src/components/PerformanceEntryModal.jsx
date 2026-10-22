import React, { useState, useEffect } from 'react';
import performanceService from '../services/performanceService';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PerformanceEntryModal = ({ isOpen, onClose, entry, activeKpis, departmentInfo, onSaveSuccess }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [kpiId, setKpiId] = useState('');
  const [periodYear, setPeriodYear] = useState(currentYear);
  const [periodMonth, setPeriodMonth] = useState(currentMonth);
  const [actualValue, setActualValue] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('submitted');

  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState(null);

  const isEditMode = !!entry;
  const selectedKpi = activeKpis.find((k) => k.id.toString() === kpiId.toString());

  useEffect(() => {
    if (entry) {
      setKpiId(entry.kpi_id ? entry.kpi_id.toString() : '');
      setPeriodYear(entry.period_year || currentYear);
      setPeriodMonth(entry.period_month || currentMonth);
      setActualValue(entry.actual_value !== undefined ? entry.actual_value : '');
      setNotes(entry.notes || '');
      setStatus(entry.status || 'submitted');
    } else {
      setKpiId(activeKpis.length > 0 ? activeKpis[0].id.toString() : '');
      setPeriodYear(currentYear);
      setPeriodMonth(currentMonth);
      setActualValue('');
      setNotes('');
      setStatus('submitted');
    }
    setErrorAlert(null);
  }, [entry, isOpen, activeKpis]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorAlert(null);

    if (!kpiId) {
      setErrorAlert('Please select an active Key Performance Indicator.');
      return;
    }

    const numericVal = parseFloat(actualValue);
    if (isNaN(numericVal) || numericVal < 0) {
      setErrorAlert('Actual value must be a valid non-negative number.');
      return;
    }

    setLoading(true);

    try {
      if (isEditMode) {
        await performanceService.updateEntry(entry.id, {
          actual_value: numericVal,
          notes: notes.trim() || null,
          status,
        });
      } else {
        await performanceService.createEntry({
          kpi_id: parseInt(kpiId, 10),
          period_year: parseInt(periodYear, 10),
          period_month: parseInt(periodMonth, 10),
          actual_value: numericVal,
          notes: notes.trim() || null,
          status,
        });
      }

      setLoading(false);
      onSaveSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : 'Failed to save performance data.');
      setErrorAlert(msg);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              {isEditMode ? '✏️ Update Performance Data' : '📝 Enter Department Performance Data'}
            </h2>
            <span style={styles.subtitle}>
              Assigned Department: <strong>{departmentInfo ? `${departmentInfo.name} (${departmentInfo.code})` : 'Your Department'}</strong>
            </span>
          </div>
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
            <label style={styles.label}>Key Performance Indicator (Active KPIs Only) *</label>
            <select
              value={kpiId}
              onChange={(e) => setKpiId(e.target.value)}
              style={styles.select}
              required
              disabled={isEditMode}
            >
              {activeKpis.length === 0 && <option value="">No Active KPIs available</option>}
              {activeKpis.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({k.unit} — Target: {k.target_value})
                </option>
              ))}
            </select>
          </div>

          {selectedKpi && (
            <div style={styles.kpiContextCard}>
              <div style={styles.kpiContextRow}>
                <div>
                  <small style={styles.smallLabel}>Target Benchmark</small>
                  <div style={styles.kpiTargetVal}>
                    {selectedKpi.target_value} <small>{selectedKpi.unit}</small>
                  </div>
                </div>
                <div>
                  <small style={styles.smallLabel}>Performance Rule</small>
                  <div>
                    {selectedKpi.higher_is_better ? (
                      <span style={styles.ruleHigher}>Higher is Better ↑</span>
                    ) : (
                      <span style={styles.ruleLower}>Lower is Better ↓</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Reporting Year *</label>
              <select
                value={periodYear}
                onChange={(e) => setPeriodYear(e.target.value)}
                style={styles.select}
                required
                disabled={isEditMode}
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Reporting Month *</label>
              <select
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                style={styles.select}
                required
                disabled={isEditMode}
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1} - {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Actual Measured Value *</label>
            <div style={styles.inputWithUnit}>
              <input
                type="number"
                step="any"
                min="0"
                value={actualValue}
                onChange={(e) => setActualValue(e.target.value)}
                placeholder="e.g. 92.5"
                style={styles.input}
                required
              />
              <span style={styles.unitAddon}>{selectedKpi ? selectedKpi.unit : 'unit'}</span>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Submission Status *</label>
            <div style={styles.statusRadioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="status"
                  value="submitted"
                  checked={status === 'submitted'}
                  onChange={() => setStatus('submitted')}
                  style={{ accentColor: '#10b981' }}
                />
                <span><strong>Submitted</strong> (Final monthly report entry)</span>
              </label>

              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                  style={{ accentColor: '#38bdf8' }}
                />
                <span><strong>Draft</strong> (Work in progress entry)</span>
              </label>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Officer Notes / Remarks (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide explanations, caveats, or contextual notes for this month's measured data..."
              rows={3}
              style={{ ...styles.input, resize: 'vertical' }}
            />
          </div>

          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={styles.saveBtn}>
              {loading ? 'Saving Entry...' : isEditMode ? 'Update Record' : 'Save Performance Entry'}
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
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '800',
    margin: '0 0 0.2rem 0',
  },
  subtitle: {
    fontSize: '0.78rem',
    color: '#94a3b8',
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
  row: {
    display: 'flex',
    gap: '0.75rem',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#cbd5e1',
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
  inputWithUnit: {
    display: 'flex',
    alignItems: 'center',
  },
  unitAddon: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderLeft: 'none',
    padding: '0.65rem 0.85rem',
    borderTopRightRadius: '8px',
    borderBottomRightRadius: '8px',
    fontSize: '0.85rem',
    color: '#38bdf8',
    fontWeight: '600',
  },
  kpiContextCard: {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
  },
  kpiContextRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallLabel: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  kpiTargetVal: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#38bdf8',
  },
  ruleHigher: {
    fontSize: '0.75rem',
    color: '#34d399',
    fontWeight: '700',
  },
  ruleLower: {
    fontSize: '0.75rem',
    color: '#38bdf8',
    fontWeight: '700',
  },
  statusRadioGroup: {
    display: 'flex',
    gap: '1rem',
    background: 'rgba(15, 23, 42, 0.4)',
    padding: '0.65rem 0.85rem',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.82rem',
    color: '#cbd5e1',
    cursor: 'pointer',
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

export default PerformanceEntryModal;
