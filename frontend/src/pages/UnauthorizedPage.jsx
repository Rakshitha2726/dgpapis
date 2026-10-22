import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const UnauthorizedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    switch (user.role) {
      case 'admin':
        navigate('/admin');
        break;
      case 'department_officer':
        navigate('/officer');
        break;
      case 'policymaker':
        navigate('/policymaker');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.icon}>🛑</div>
          <div style={styles.code}>403 — ACCESS DENIED</div>
          <h1 style={styles.title}>Unauthorized Page Access</h1>
          <p style={styles.message}>
            You do not have the required role permissions to access this page.
          </p>

          {user && (
            <div style={styles.infoBox}>
              <div>Your Account: <strong>{user.email}</strong></div>
              <div>Current Role: <span style={styles.roleBadge}>{user.role}</span></div>
            </div>
          )}

          <button onClick={handleGoHome} style={styles.btn}>
            Return to Authorized Portal 🏠
          </button>
        </div>
      </div>
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 1.5rem',
  },
  card: {
    maxWidth: '480px',
    width: '100%',
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '16px',
    padding: '2.5rem',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
  },
  icon: {
    fontSize: '3.5rem',
    marginBottom: '0.75rem',
  },
  code: {
    fontSize: '0.8rem',
    fontWeight: '800',
    color: '#f87171',
    letterSpacing: '1.5px',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '800',
    margin: '0 0 0.75rem 0',
  },
  message: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    marginBottom: '1.5rem',
  },
  infoBox: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '0.85rem 1rem',
    marginBottom: '1.75rem',
    fontSize: '0.85rem',
    color: '#cbd5e1',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  roleBadge: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '0.1rem 0.5rem',
    borderRadius: '4px',
    fontWeight: '700',
  },
  btn: {
    padding: '0.75rem 1.5rem',
    background: '#0284c7',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
};

export default UnauthorizedPage;
