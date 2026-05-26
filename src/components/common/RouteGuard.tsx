import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes';

interface RouteGuardProps {
  children: React.ReactNode;
}

// System-level public routes (no need to register in routes.tsx)
const SYSTEM_PUBLIC_ROUTES = ['/login', '/403', '/404'];

// Derived from routes.tsx: all routes marked with public: true
const routePublicPaths = routes.filter(r => r.public).map(r => r.path);

const PUBLIC_ROUTES = [...SYSTEM_PUBLIC_ROUTES, ...routePublicPaths];
const PRIVATE_ROUTE_EXCEPTIONS = ['/events/new'];

function matchPublicRoute(path: string, patterns: string[]) {
  if (PRIVATE_ROUTE_EXCEPTIONS.includes(path)) return false;

  return patterns.some(pattern => {
    // 处理 React Router 的 :param 和 * 通配符
    if (pattern.includes(':') || pattern.includes('*')) {
      const regexStr = pattern
        .replace(/:[\w]+/g, '[^/]+')  // :paramName → 匹配非斜杠的任意字符
        .replace(/\*/g, '.*');         // * → 匹配任意字符
      const regex = new RegExp('^' + regexStr + '$');
      return regex.test(path);
    }
    return path === pattern;
  });
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);

    if (!user && !isPublic) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` }, replace: true });
    }
  }, [user, loading, location.pathname, location.search, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
