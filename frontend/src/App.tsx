import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { AdminLayout } from './components/layouts/AdminLayout';
import { MarketingLayout } from './components/layouts/MarketingLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { CustomerManagementPage } from './pages/admin/CustomerManagementPage';
import { TemplateManagementPage } from './pages/admin/TemplateManagementPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { PermissionManagementPage } from './pages/admin/PermissionManagementPage';
import { MarketingDashboardPage } from './pages/marketing/MarketingDashboardPage';
import { ProspectListPage } from './pages/marketing/ProspectListPage';
import { BroadcastFormPage } from './pages/marketing/BroadcastFormPage';
import { BroadcastHistoryPage } from './pages/marketing/BroadcastHistoryPage';
import { QRScannerPage } from './pages/marketing/QRScannerPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { usePermissions } from './hooks/usePermissions';
import { Skeleton } from './components/ui/Skeleton';
import { ToastProvider } from './components/ui/Toast';
import type { ReactNode } from 'react';

function LoadingScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-fif-600" />
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
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          <Route path="/admin" element={<ProtectedRoute roles={['superadmin', 'UH']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<RequireFeature feature="dashboard"><DashboardPage /></RequireFeature>} />
            <Route path="broadcast" element={<RequireFeature feature="prospect_list"><ProspectListPage /></RequireFeature>} />
            <Route path="broadcast/:customerId" element={<RequireFeature feature="broadcast"><BroadcastFormPage /></RequireFeature>} />
            <Route path="customers" element={<RequireFeature feature="customer_management"><CustomerManagementPage /></RequireFeature>} />
            <Route path="templates" element={<RequireFeature feature="template_management"><TemplateManagementPage /></RequireFeature>} />
            <Route path="connect" element={<RequireFeature feature="qr_scanner"><QRScannerPage /></RequireFeature>} />
            <Route path="users" element={<ProtectedRoute roles={['superadmin']}><UserManagementPage /></ProtectedRoute>} />
            <Route path="permissions" element={<ProtectedRoute roles={['superadmin']}><PermissionManagementPage /></ProtectedRoute>} />
          </Route>

          <Route path="/marketing" element={<ProtectedRoute roles={['marketing']}><MarketingLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<RequireFeature feature="dashboard"><MarketingDashboardPage /></RequireFeature>} />
            <Route path="broadcast" element={<RequireFeature feature="prospect_list"><ProspectListPage /></RequireFeature>} />
            <Route path="customers" element={<RequireFeature feature="customer_management"><CustomerManagementPage /></RequireFeature>} />
            <Route path="broadcast/:customerId" element={<RequireFeature feature="broadcast"><BroadcastFormPage /></RequireFeature>} />
            <Route path="history" element={<RequireFeature feature="broadcast_history"><BroadcastHistoryPage /></RequireFeature>} />
            <Route path="connect" element={<RequireFeature feature="qr_scanner"><QRScannerPage /></RequireFeature>} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
