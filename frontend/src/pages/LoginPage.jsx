import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(true);

  const { login, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      // Redirect to role-appropriate home route if no target requested
      if (from && from !== '/login' && from !== '/unauthorized') {
        navigate(from, { replace: true });
      } else {
        switch (result.user.role) {
          case 'admin':
            navigate('/admin', { replace: true });
            break;
          case 'department_officer':
            navigate('/officer', { replace: true });
            break;
          case 'policymaker':
            navigate('/policymaker', { replace: true });
            break;
          default:
            navigate('/', { replace: true });
        }
      }
    }
  };

  const fillTestCredentials = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Admin@1234');
    setAuthError(null);
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoIcon}>🏛️</div>
          <h1 style={styles.title}>Digital Governance Portal</h1>
          <p style={styles.subtitle}>
            Performance Assessment & Policy Intelligence System (DGPAPIS)
          </p>
        </div>

        {authError && (
          <div style={styles.errorAlert}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div>{authError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="email" style={styles.label}>Official Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. officer.health@dgpapis.gov"
              style={styles.input}
              required
              autoComplete="username"
            />
          </div>

          <div style={styles.formGroup}>
            <div style={styles.labelRow}>
              <label htmlFor="password" style={styles.label}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.toggleBtn}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={styles.input}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.submitBtn,
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In to Portal 🔒'}
          </button>
        </form>

        {/* Development Helper Panel (Discrete Dev Helper) */}
        <div style={styles.devPanel}>
          <div style={styles.devHeader} onClick={() => setShowDevPanel(!showDevPanel)}>
            <span>🛠️ Development Test Credentials Helper</span>
            <span style={{ fontSize: '0.8rem' }}>{showDevPanel ? '▲ Hide' : '▼ Expand'}</span>
          </div>

          {showDevPanel && (
            <div style={styles.devContent}>
              <p style={styles.devNotice}>
                Click any role to auto-fill test account credentials into the form above for evaluation:
              </p>
              <div style={styles.devButtonsGrid}>
                <button
                  type="button"
                  onClick={() => fillTestCredentials('admin@dgpapis.gov')}
                  style={styles.devBadgeAdmin}
                >
                  👑 Admin <br />
                  <small style={styles.devEmailText}>admin@dgpapis.gov</small>
                </button>

                <button
                  type="button"
                  onClick={() => fillTestCredentials('officer.health@dgpapis.gov')}
                  style={styles.devBadgeOfficer}
                >
                  🏥 Department Officer <br />
                  <small style={styles.devEmailText}>officer.health@dgpapis.gov</small>
                </button>

                <button
                  type="button"
                  onClick={() => fillTestCredentials('analyst1@dgpapis.gov')}
                  style={styles.devBadgePolicy}
                >
                  📊 Policymaker <br />
                  <small style={styles.devEmailText}>analyst1@dgpapis.gov</small>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at top, #1e293b 0%, #0f172a 100%)',
    padding: '1.5rem',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    background: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '2.25rem',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#f8fafc',
    margin: '0 0 0.4rem 0',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    lineHeight: '1.4',
    margin: 0,
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#38bdf8',
    fontSize: '0.78rem',
    cursor: 'pointer',
    padding: 0,
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    color: '#f8fafc',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  },
  submitBtn: {
    marginTop: '0.5rem',
    padding: '0.85rem',
    background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '1rem',
    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
    transition: 'all 0.2s ease',
  },
  devPanel: {
    marginTop: '2rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  devHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.75rem',
  },
  devContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  devNotice: {
    fontSize: '0.75rem',
    color: '#64748b',
    margin: '0 0 0.5rem 0',
  },
  devButtonsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  devBadgeAdmin: {
    padding: '0.5rem 0.75rem',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    color: '#fca5a5',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  devBadgeOfficer: {
    padding: '0.5rem 0.75rem',
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '8px',
    color: '#7dd3fc',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  devBadgePolicy: {
    padding: '0.5rem 0.75rem',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: '8px',
    color: '#6ee7b7',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  devEmailText: {
    fontWeight: '400',
    opacity: 0.85,
  },
};

export default LoginPage;
