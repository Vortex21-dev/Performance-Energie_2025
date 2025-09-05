import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'guest' | 'contributeur' | 'validateur' | 'admin_client';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // If role is required and user doesn't have it, redirect to appropriate page
  if (requiredRole) {
    // Special case for admin_client - they can access guest routes
    if (requiredRole === 'guest' && (user.role === 'admin_client' || user.role === 'admin' || user.role === 'contributeur' || user.role === 'validateur')) {
      return <>{children}</>;
    }
    
    // Special case for admin - they can access any route
    if (user.role === 'admin') {
      return <>{children}</>;
    }
    
    // Check specific role requirements
    if (requiredRole === 'admin' && user.role !== 'admin') {
      return <Navigate to="/dashboard" />;
    } else if (requiredRole === 'contributeur' && user.role !== 'contributeur') {
      return <Navigate to="/dashboard" />;
    } else if (requiredRole === 'validateur' && user.role !== 'validateur') {
      return <Navigate to="/dashboard" />;
    } else if (requiredRole === 'admin_client' && user.role !== 'admin_client') {
      return <Navigate to="/dashboard" />;
    }
  }
  
  // If authenticated and has correct role, render children
  return <>{children}</>;
};

export default ProtectedRoute;