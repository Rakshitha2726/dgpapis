import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span style={styles.badgeAdmin}>System Admin</span>;
      case 'department_officer':
        return (
          <span style={styles.badgeOfficer}>
            Officer ({user.department ? user.department.code : 'Dept'})
          </span>
        );
      case 'policymaker':
        return <span style={styles.badgePolicy}>Senior Policymaker</span>;
      default:
        return <span style={styles.badgeDefault}>{role}</span>;
    }
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <div style={styles.leftSection}>
          <Link to="/" style={styles.brandLink}>
            <span style={styles.brandEmblem}>🏛️</span>
            <div>
              <div style={styles.brandTitle}>DGPAPIS</div>
              <div style={styles.brandSubtitle}>Governance Intelligence</div>
            </div>
          </Link>
        </div>

        {user && (
          <div style={styles.rightSection}>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user.name}</span>
              {getRoleBadge(user.role)}
            </div>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Logout 🚪
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '0.75rem 1.5rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  brandLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    color: '#ffffff',
  },
  brandEmblem: {
    fontSize: '1.75rem',
  },
  brandTitle: {
    fontWeight: '800',
    fontSize: '1.2rem',
    letterSpacing: '0.5px',
    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  brandSubtitle: {
    fontSize: '0.7rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.2rem',
  },
  userName: {
    color: '#f8fafc',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  badgeAdmin: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '0.15rem 0.6rem',
    fontSize: '0.72rem',
    fontWeight: '600',
  },
  badgeOfficer: {
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '12px',
    padding: '0.15rem 0.6rem',
    fontSize: '0.72rem',
    fontWeight: '600',
  },
  badgePolicy: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '12px',
    padding: '0.15rem 0.6rem',
    fontSize: '0.72rem',
    fontWeight: '600',
  },
  badgeDefault: {
    background: 'rgba(148, 163, 184, 0.15)',
    color: '#cbd5e1',
    borderRadius: '12px',
    padding: '0.15rem 0.6rem',
    fontSize: '0.72rem',
  },
  logoutBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#cbd5e1',
    padding: '0.45rem 0.9rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
};

export default Navbar;
