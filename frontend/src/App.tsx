import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminLayout } from './components/layouts/AdminLayout';
import { MarketingLayout } from './components/layouts/MarketingLayout';
import { usePermissions } from './hooks/usePermissions';
import { Skeleton } from './components/ui/Skeleton';
import { ToastProvider } from './components/ui/Toast';
import type { ReactNode, ComponentType } from 'react';

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CustomerManagementPage = lazy(() => import('./pages/admin/CustomerManagementPage').then(m => ({ default: m.CustomerManagementPage })));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const PermissionManagementPage = lazy(() => import('./pages/admin/PermissionManagementPage').then(m => ({ default: m.PermissionManagementPage })));
const MarketingDashboardPage = lazy(() => import('./pages/marketing/MarketingDashboardPage').then(m => ({ default: m.MarketingDashboardPage })));
const ProspectListPage = lazy(() => import('./pages/marketing/ProspectListPage').then(m => ({ default: m.ProspectListPage })));
const BroadcastFormPage = lazy(() => import('./pages/marketing/BroadcastFormPage').then(m => ({ default: m.BroadcastFormPage })));
const BroadcastHistoryPage = lazy(() => import('./pages/marketing/BroadcastHistoryPage').then(m => ({ default: m.BroadcastHistoryPage })));
const QRScannerPage = lazy(() => import('./pages/marketing/QRScannerPage').then(m => ({ default: m.QRScannerPage })));
const CalculatorPage = lazy(() => import('./pages/CalculatorPage').then(m => ({ default: m.CalculatorPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function LoadingScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="FIF" className="h-8 w-8 animate-pulse object-contain" />
        <span className="text-xl font-bold text-slate-800">FIF</span>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-2 w-12 rounded-full" />
        <Skeleton className="h-2 w-8 rounded-full" />
        <Skeleton className="h-2 w-10 rounded-full" />
      </div>
    </div>
  );
}

function SuspendedPage({ Component }: { Component: ComponentType }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Component />
    </Suspense>
  );
}

function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireFeature({ children, feature }: { children: ReactNode; feature: string }) {
  const { user, loading: authLoading } = useAuth();
  const { hasFeature, loading: permLoading } = usePermissions();

  if (authLoading || (user?.role !== 'superadmin' && permLoading && feature)) {
    return <LoadingScreen />;
  }

  if (user?.role !== 'superadmin' && !hasFeature(feature)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    if (user.role === 'superadmin' || user.role === 'UH') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'marketing') return <Navigate to="/marketing/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
        <ToastProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><SuspendedPage Component={LoginPage} /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><SuspendedPage Component={RegisterPage} /></PublicRoute>} />

          <Route path="/admin" element={<ProtectedRoute roles={['superadmin', 'UH']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<RequireFeature feature="dashboard"><SuspendedPage Component={DashboardPage} /></RequireFeature>} />
            <Route path="broadcast" element={<RequireFeature feature="prospect_list"><SuspendedPage Component={ProspectListPage} /></RequireFeature>} />
            <Route path="broadcast/:customerId" element={<RequireFeature feature="broadcast"><SuspendedPage Component={BroadcastFormPage} /></RequireFeature>} />
            <Route path="customers" element={<RequireFeature feature="customer_management"><SuspendedPage Component={CustomerManagementPage} /></RequireFeature>} />
            <Route path="connect" element={<RequireFeature feature="qr_scanner"><SuspendedPage Component={QRScannerPage} /></RequireFeature>} />
            <Route path="users" element={<ProtectedRoute roles={['superadmin', 'UH']}><SuspendedPage Component={UserManagementPage} /></ProtectedRoute>} />
            <Route path="permissions" element={<ProtectedRoute roles={['superadmin']}><SuspendedPage Component={PermissionManagementPage} /></ProtectedRoute>} />
            <Route path="history" element={<RequireFeature feature="broadcast_history"><SuspendedPage Component={BroadcastHistoryPage} /></RequireFeature>} />
            <Route path="settings" element={<SuspendedPage Component={SettingsPage} />} />
            <Route path="calculator" element={<SuspendedPage Component={CalculatorPage} />} />
          </Route>

          <Route path="/marketing" element={<ProtectedRoute roles={['marketing']}><MarketingLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<RequireFeature feature="dashboard"><SuspendedPage Component={MarketingDashboardPage} /></RequireFeature>} />
            <Route path="broadcast" element={<RequireFeature feature="prospect_list"><SuspendedPage Component={ProspectListPage} /></RequireFeature>} />
            <Route path="customers" element={<RequireFeature feature="customer_management"><SuspendedPage Component={CustomerManagementPage} /></RequireFeature>} />
            <Route path="broadcast/:customerId" element={<RequireFeature feature="broadcast"><SuspendedPage Component={BroadcastFormPage} /></RequireFeature>} />
            <Route path="history" element={<RequireFeature feature="broadcast_history"><SuspendedPage Component={BroadcastHistoryPage} /></RequireFeature>} />
            <Route path="connect" element={<RequireFeature feature="qr_scanner"><SuspendedPage Component={QRScannerPage} /></RequireFeature>} />
            <Route path="settings" element={<SuspendedPage Component={SettingsPage} />} />
            <Route path="calculator" element={<SuspendedPage Component={CalculatorPage} />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<SuspendedPage Component={NotFoundPage} />} />
        </Routes>
        </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
