import React from 'react';
import { Navigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  
  if (user && !isLoading) {
    // Redirect admin users to admin page, others to dashboard
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} />;
  }
  
  return (
    <LoginForm />
  );
};

export default LoginPage;