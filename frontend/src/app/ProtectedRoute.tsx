import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth';

type Props = {
  children?: React.ReactNode;
};

export const ProtectedRoute = ({ children }: Props) => {
  const { token, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="page-shell">
        <p className="muted">Chargement de la session...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
