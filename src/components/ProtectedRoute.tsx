// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPage?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPage 
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check page access if requiredPage is specified
  if (requiredPage) {
    const hasAccess = user.role === 'admin' || 
      (user.pageAccess && user.pageAccess.split(',').map(p => p.trim().toLowerCase()).includes(requiredPage.toLowerCase()));
    
    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;