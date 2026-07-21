import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { Dashboard } from './features/dashboard';
import { LocalChargesList, LocalChargesForm } from './features/local-charges';
import { InspectionReportsList, InspectionReportForm } from './features/inspection-reports';
import { Login, Register, Profile } from './features/auth';
import { Users, Roles } from './features/users';
import { RecycleBin } from './features/recycle-bin';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import {
  PriceListDashboard,
  PriceListHistory,
  PriceListUpload,
  PriceListDetail
} from './features/price-list';
import { hasPermission } from './lib/permissions';

const queryClient = new QueryClient();

// Protected Route wrapper
// useAuthStore.persist.hasHydrated() ensures we don't redirect before
// Zustand has finished reading the persisted state from localStorage.
// Without this, production builds can flash-redirect to /login on page load.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [hydrated, setHydrated] = React.useState(
    useAuthStore.persist.hasHydrated()
  );

  React.useEffect(() => {
    const unsub = useAuthStore.persist.onHydrate(() => setHydrated(false));
    const unsubFinish = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    // In case hydration already happened before this effect runs
    setHydrated(useAuthStore.persist.hasHydrated());
    return () => {
      unsub();
      unsubFinish();
    };
  }, []);

  // Still loading from localStorage — don't redirect yet
  if (!hydrated) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Permission-based Route wrapper — redirects to dashboard if user lacks permission
const PermissionRoute = ({ children, permission }: { children: React.ReactNode; permission: string }) => {
  const user = useAuthStore((state) => state.user);
  if (!hasPermission(user, permission)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  const theme = useThemeStore((state) => state.theme);

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <Router basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            } 
          >
            <Route index element={<Dashboard />} />
            <Route path="local-charges" element={<PermissionRoute permission="local_charges:create"><LocalChargesList /></PermissionRoute>} />
            <Route path="new" element={<PermissionRoute permission="local_charges:create"><LocalChargesForm /></PermissionRoute>} />
            <Route path="form/:id" element={<PermissionRoute permission="local_charges:create"><LocalChargesForm /></PermissionRoute>} />
            <Route path="users" element={<Users />} />
            <Route path="roles" element={<Roles />} />
            <Route path="recycle-bin" element={<PermissionRoute permission="local_charges:delete"><RecycleBin /></PermissionRoute>} />
            <Route path="inspection-reports" element={<PermissionRoute permission="local_charges:create"><InspectionReportsList /></PermissionRoute>} />
            <Route path="inspection-reports/new" element={<PermissionRoute permission="local_charges:create"><InspectionReportForm /></PermissionRoute>} />
            <Route path="inspection-reports/:id" element={<PermissionRoute permission="local_charges:create"><InspectionReportForm /></PermissionRoute>} />
            <Route path="pricelist" element={<PermissionRoute permission="pricelist:read"><PriceListDashboard /></PermissionRoute>} />
            <Route path="pricelist/dashboard" element={<PermissionRoute permission="pricelist:read"><PriceListDashboard /></PermissionRoute>} />
            <Route path="pricelist/uploads" element={<PermissionRoute permission="pricelist:read"><PriceListHistory /></PermissionRoute>} />
            <Route path="pricelist/uploads/:id" element={<PermissionRoute permission="pricelist:read"><PriceListDetail /></PermissionRoute>} />
            <Route path="pricelist/upload" element={<PermissionRoute permission="pricelist:upload"><PriceListUpload /></PermissionRoute>} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
