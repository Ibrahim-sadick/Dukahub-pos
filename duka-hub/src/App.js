import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthLanding from './auth/AuthLanding';
import ModuleSelect from './auth/ModuleSelect';
import PlanSelect from './auth/PlanSelect';
import ResetPassword from './auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Stocks from './pages/Stocks';
import Expenses from './pages/Expenses';
import Invoice from './pages/Invoice';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Support from './pages/Support';
import Placeholder from './pages/Placeholder';
import Layout from './shared/Layout';
import StaffList from './pages/StaffList';
import Purchases from './pages/Purchases';
import Suppliers from './pages/Suppliers';
import RolesPermissions from './pages/RolesPermissions';
import PurchaseHistory from './pages/PurchaseHistory';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme';
import { authApi, authStorage, syncLocalAuthStateFromBackendMe } from './services/backendApi';

// Authenticated Routes Component with Auto-Logout on Inactivity
function AuthenticatedRoutes({ onLogout }) {
  const getCurrentUser = () => {
    try {
      const local = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (local) return local;
    } catch {}
    try {
      const session = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
      if (session) return session;
    } catch {}
    return null;
  };
  const AdminOnly = ({ children }) => {
    const user = getCurrentUser();
    const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
    if (!isAdmin) return <Navigate to="/dashboard" replace />;
    return children;
  };

  const PostAuthRedirect = () => {
    const [target] = useState(() => {
      try {
        return String(sessionStorage.getItem('postAuthRedirect') || '').trim();
      } catch {
        return '';
      }
    });
    useEffect(() => {
      try {
        sessionStorage.removeItem('postAuthRedirect');
      } catch {}
    }, []);
    return <Navigate to={target || '/dashboard'} replace />;
  };

  useEffect(() => {
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

    const resetTimers = () => {
      // Clear existing timer
      if (inactivityTimer) clearTimeout(inactivityTimer);

      // Set logout timer (30 minutes) - silent auto-logout without any warnings
      inactivityTimer = setTimeout(() => {
        onLogout();
      }, INACTIVITY_TIMEOUT);
    };

    // Events to track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimers);
    });

    // Initialize timer
    resetTimers();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimers);
      });
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [onLogout]);

  return (
    <Layout onLogout={onLogout}>
          <Routes>
            <Route path="/" element={<PostAuthRedirect />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/stocks" element={<Stocks />} />
            <Route path="/placeholder/:page" element={<Placeholder />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/invoice" element={<Invoice />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/purchases/history" element={<PurchaseHistory />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/reports" element={<AdminOnly><Reports /></AdminOnly>} />
            <Route path="/users" element={<AdminOnly><Users /></AdminOnly>} />
            <Route path="/users/list" element={<AdminOnly><StaffList /></AdminOnly>} />
            <Route path="/staff-records" element={<Navigate to="/users" replace />} />
            <Route path="/staff-records/list" element={<Navigate to="/users/list" replace />} />
            <Route path="/roles-permissions" element={<AdminOnly><RolesPermissions /></AdminOnly>} />
            <Route path="/plans" element={<PlanSelect onSignUp={() => {}} />} />
            <Route path="/settings" element={<AdminOnly><Settings /></AdminOnly>} />
            <Route path="/support" element={<Support />} />
            <Route path="*" element={<PostAuthRedirect />} />
          </Routes>
      </Layout>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
 
  const appendSystemActivity = useCallback((type, title, details, module) => {
    try {
      const now = new Date().toISOString();
      const list = JSON.parse(localStorage.getItem('systemActivity') || '[]');
      const arr = Array.isArray(list) ? list : [];
      arr.unshift({
        id: `${type}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        type,
        title,
        details,
        module,
        ts: now
      });
      const capped = arr.slice(0, 500);
      localStorage.setItem('systemActivity', JSON.stringify(capped));
      window.dispatchEvent(new CustomEvent('dataUpdated'));
    } catch {}
  }, []);

  useEffect(() => {
    const tokens = authStorage.getTokens();
    if (!tokens?.accessToken) {
      setIsBootstrapping(false);
      return;
    }
    Promise.resolve()
      .then(() => authApi.me())
      .then((me) => {
        const rememberMe = tokens.storage === 'local';
        syncLocalAuthStateFromBackendMe(me, rememberMe);
        setIsAuthenticated(true);
      })
      .catch(() => {
        authStorage.clear();
        try {
          localStorage.removeItem('currentUser');
          sessionStorage.removeItem('currentUser');
        } catch {}
        setIsAuthenticated(false);
      })
      .finally(() => setIsBootstrapping(false));
  }, []);

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
    try {
      const user =
        JSON.parse(localStorage.getItem('currentUser') || 'null') ||
        JSON.parse(sessionStorage.getItem('currentUser') || 'null');
      const name = (user?.name || user?.fullName || user?.email || user?.staffEmployeeId || 'User').toString();
      const role = (user?.role || '').toString();
      appendSystemActivity('login', 'User signed in', `${name} (${role}) logged in`, 'Auth');
    } catch {
      appendSystemActivity('login', 'User signed in', 'A user logged in', 'Auth');
    }
  }, [appendSystemActivity]);

  const handleLogout = useCallback(() => {
    try {
      const user =
        JSON.parse(localStorage.getItem('currentUser') || 'null') ||
        JSON.parse(sessionStorage.getItem('currentUser') || 'null');
      const name = (user?.name || user?.fullName || user?.email || user?.staffEmployeeId || 'User').toString();
      const role = (user?.role || '').toString();
      appendSystemActivity('logout', 'User signed out', `${name} (${role}) logged out`, 'Auth');
    } catch {
      appendSystemActivity('logout', 'User signed out', 'A user logged out', 'Auth');
    }
    setIsAuthenticated(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('currentUser');
  }, [appendSystemActivity]);

  useEffect(() => {
    const onForceLogout = () => {
      handleLogout();
    };
    window.addEventListener('forceLogout', onForceLogout);
    return () => window.removeEventListener('forceLogout', onForceLogout);
  }, [handleLogout]);

  const handleSignUp = () => {
    setIsAuthenticated(true);
  };
  

  return (
    <I18nProvider>
      <ThemeProvider>
        <Router>
          <div className="App">
            {isBootstrapping ? null : !isAuthenticated ? (
              <Routes>
                <Route path="/" element={<AuthLanding onLogin={handleLogin} onSignUp={handleSignUp} />} />
                <Route path="/login" element={<AuthLanding onLogin={handleLogin} onSignUp={handleSignUp} />} />
                <Route path="/signup" element={<AuthLanding onLogin={handleLogin} onSignUp={handleSignUp} />} />
                <Route path="/signup/modules" element={<ModuleSelect onSignUp={handleSignUp} />} />
                <Route path="/signup/plan" element={<PlanSelect onSignUp={handleSignUp} />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </Routes>
            ) : (
              <AuthenticatedRoutes onLogout={() => authApi.logout().finally(handleLogout)} />
            )}
          </div>
        </Router>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
