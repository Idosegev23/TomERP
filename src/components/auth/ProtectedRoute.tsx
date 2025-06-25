import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from './AuthContext';
import { Loader } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  resource?: string;
  resourceId?: string;
  fallbackPath?: string;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  resource,
  resourceId,
  fallbackPath = '/login',
  fallback
}) => {
  const { user, loading, hasAccess } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute check:', {
    path: location.pathname,
    userEmail: user?.email,
    userRole: user?.user_role,
    loading,
    requiredRole,
    resource,
    resourceId
  });

  if (loading) {
    // Use custom fallback if provided, otherwise use default
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader className="h-6 w-6 animate-spin" />
          <span>טוען...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole && user.user_role !== requiredRole && user.user_role !== 'admin' && user.user_role !== 'super_admin') {
    console.log('Access denied - role mismatch:', {
      required: requiredRole,
      actual: user.user_role
    });
    return <Navigate to="/unauthorized" replace />;
  }

  // Check resource-based access
  if (resource && !hasAccess(resource, resourceId)) {
    console.log('Access denied - resource mismatch:', {
      resource,
      resourceId
    });
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}; 