import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'department_officer':
      return <Navigate to="/officer" replace />;
    case 'policymaker':
      return <Navigate to="/policymaker" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default HomePage;
