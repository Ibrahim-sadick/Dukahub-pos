import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AuthLanding from './auth/AuthLanding';
import PlanSelect from './auth/PlanSelect';
import ResetPassword from './auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Invoice from './pages/Invoice';
import Reports from './pages/Reports';
import Placeholder from './pages/Placeholder';
import Layout from './shared/Layout';
import Purchases from './pages/Purchases';
import Suppliers from './pages/Suppliers';
import PurchaseHistory from './pages/PurchaseHistory';
import { I18nProvider } from './i18n';
import { appendSystemActivity } from './utils/systemActivity';
import { bootstrapAuthSession, getCurrentUserSync as getLocalCurrentUserSync, logoutAuth } from './services/authApi';

const authApi = {
  getCurrentUserSync() {
    return getLocalCurrentUserSync();
  },
  async bootstrap() {
    try {
      return await bootstrapAuthSession();
    } catch {
      return getLocalCurrentUserSync();
    }
  },
  async logout() {
    return logoutAuth();
  }
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: String(error?.message || error || 'Something went wrong') };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 text-gray-800 max-w-xl w-full">
            <div className="text-lg font-semibold">Page failed to load</div>
            <div className="text-sm text-gray-600 mt-2 break-words">{this.state.message}</div>
            <div className="mt-4 flex gap-2">
              <button className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" onClick={() => window.location.reload()}>
                Reload
              </button>
              <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100" onClick={() => this.setState({ hasError: false, message: '' })}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function TitleManager() {
  const location = useLocation();
  useEffect(() => {
    const path = String(location.pathname || '');
    const base = 'DukaHub';
    const titles = {
      '/login': `${base} Login`,
      '/signup': `${base} Sign Up`,
      '/reset-password': `${base} Reset Password`,
      '/dashboard': `${base} Dashboard`,
      '/sales': `${base} Sales`,
      '/expenses': `${base} Expenses`,
      '/invoice': `${base} Invoice`,
      '/purchases': `${base} Purchases`,
      '/purchases/history': `${base} Purchase History`,
      '/suppliers': `${base} Suppliers`,
      '/reports': `${base} Reports`,
      '/settings': `${base} Settings`,
      '/plans': `${base} Plans`
    };
    if (titles[path]) {
      document.title = titles[path];
      return;
    }
    if (path.startsWith('/placeholder/')) {
      const page = decodeURIComponent(path.slice('/placeholder/'.length));
      const map = {
        store: 'Products & Store',
        products: 'Products',
        notifications: 'Activity',
        'settings-preferences': 'System Preferences',
        'alerts-low-stock': 'Low Stock',
        'sales-analytics': 'Sales Analytics',
        'expenses-analytics': 'Expenses Analytics',
        'reports-sales': 'Sales Report',
        'reports-expenses': 'Expenses Report',
        'reports-production': 'Purchase Report',
        support: 'Support'
      };
      const label = map[page] || page.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
      document.title = `${base} ${label}`.trim();
      return;
    }
    if (path === '/' || !path) {
      document.title = base;
      return;
    }
    document.title = base;
  }, [location.pathname]);
  return null;
}

function SubscriptionLockNavigator() {
  const navigate = useNavigate();
  useEffect(() => {
    const onLocked = () => {
      navigate('/plans', { replace: true });
    };
    window.addEventListener('subscriptionLocked', onLocked);
    return () => window.removeEventListener('subscriptionLocked', onLocked);
  }, [navigate]);
  return null;
}

const isSubscriptionLocked = (user) => {
  if (!user || typeof user !== 'object') return false;
  const status = String(user?.subscriptionPaymentStatus || '').trim().toLowerCase();
  const trialEndsAt = String(user?.subscriptionTrialEndsAt || '').trim();
  const endsAt = String(user?.subscriptionEndsAt || '').trim();
  const targetDate = status === 'trial' ? trialEndsAt : endsAt;
  if (!targetDate) return false;
  const ts = Date.parse(targetDate);
  if (!Number.isFinite(ts)) return false;
  return Date.now() >= ts;
};

function ProtectedRoute({ isBootstrapping, isAuthenticated, onLogout }) {
  const location = useLocation();
  const currentUser = authApi.getCurrentUserSync ? authApi.getCurrentUserSync() : null;
  useEffect(() => {
    if (isBootstrapping) return;
    if (!isAuthenticated) return;
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
    const resetTimers = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        onLogout();
      }, INACTIVITY_TIMEOUT);
    };
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      document.addEventListener(event, resetTimers);
    });
    resetTimers();
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimers);
      });
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [isAuthenticated, isBootstrapping, onLogout]);

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 text-gray-700">Loading…</div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isSubscriptionLocked(currentUser) && String(location.pathname || '').trim() !== '/plans') {
    return <Navigate to="/plans" replace />;
  }
  return <Outlet />;
}

function PublicRoute({ isBootstrapping, isAuthenticated }) {
  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 text-gray-700">Loading…</div>
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => authApi.bootstrap())
      .then((user) => {
        if (!alive) return;
        setIsAuthenticated(Boolean(user));
      })
      .finally(() => {
        if (!alive) return;
        setIsBootstrapping(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
    try {
      const user = authApi.getCurrentUserSync ? authApi.getCurrentUserSync() : null;
      const name = (user?.name || user?.fullName || user?.email || user?.staffEmployeeId || 'User').toString();
      const role = (user?.role || '').toString();
      appendSystemActivity('login', 'User signed in', `${name} (${role}) logged in`, 'Auth');
    } catch {
      appendSystemActivity('login', 'User signed in', 'A user logged in', 'Auth');
    }
  }, []);

  const handleLogout = useCallback(async () => {
    const userBeforeClear = (() => {
      try {
        return authApi.getCurrentUserSync ? authApi.getCurrentUserSync() : null;
      } catch {
        return null;
      }
    })();
    try {
      const name = (userBeforeClear?.name || userBeforeClear?.fullName || userBeforeClear?.email || userBeforeClear?.staffEmployeeId || 'User').toString();
      const role = (userBeforeClear?.role || '').toString();
      appendSystemActivity('logout', 'User signed out', `${name} (${role}) logged out`, 'Auth');
    } catch {
      appendSystemActivity('logout', 'User signed out', 'A user logged out', 'Auth');
    }
    try {
      await authApi.logout();
    } catch {}
    setIsAuthenticated(false);
  }, []);

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
      <ErrorBoundary>
        <Router>
          <TitleManager />
          <SubscriptionLockNavigator />
          <div className="App">
            <Routes>
              <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />

              <Route element={<PublicRoute isBootstrapping={isBootstrapping} isAuthenticated={isAuthenticated} />}>
                <Route path="/login" element={<AuthLanding onLogin={handleLogin} onSignUp={handleSignUp} />} />
                <Route path="/signup" element={<AuthLanding onLogin={handleLogin} onSignUp={handleSignUp} />} />
                <Route path="/signup/plan" element={<PlanSelect onSignUp={handleSignUp} />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>

              <Route element={<ProtectedRoute isBootstrapping={isBootstrapping} isAuthenticated={isAuthenticated} onLogout={handleLogout} />}>
                <Route element={<Layout onLogout={handleLogout} />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/sales" element={<Navigate to="/placeholder/sales-order" replace />} />
                    <Route path="/stocks" element={<Navigate to="/placeholder/products" replace />} />
                  <Route path="/placeholder/:page" element={<Placeholder />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/invoice" element={<Invoice />} />
                  <Route path="/purchases" element={<Purchases />} />
                  <Route path="/purchases/history" element={<PurchaseHistory />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Navigate to="/placeholder/settings-preferences?tab=profile" replace />} />
                  <Route path="/users" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/users/list" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/roles-permissions" element={<Navigate to="/dashboard" replace />} />

                  <Route path="/plans" element={<PlanSelect onSignUp={() => {}} />} />
                  <Route path="/support" element={<Navigate to="/placeholder/support" replace />} />
                  <Route path="/placeholder/accounting" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/placeholder/income-overview" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/placeholder/expense-overview" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/placeholder/stock-value" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/placeholder/period-closing" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/placeholder/audit-trail" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Route>
            </Routes>
          </div>
        </Router>
      </ErrorBoundary>
    </I18nProvider>
  );
}

export default App;
