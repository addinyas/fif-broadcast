import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminLayout } from './components/layouts/AdminLayout';
import { MarketingLayout } from './components/layouts/MarketingLayout';
import { usePermissions } from './hooks/usePermissions';
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
const TemplateManagementPage = lazy(() => import('./pages/admin/TemplateManagementPage').then(m => ({ default: m.TemplateManagementPage })));

function LoadingScreen() {
  const { user } = useAuth();
  const isDark = !user;

  return (
    <div className={`flex h-screen flex-col items-center justify-center overflow-hidden ${isDark ? 'bg-gradient-to-br from-slate-950 via-fif-950 to-slate-950' : 'bg-surface'}`}>
      {isDark && (
        <>
          <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 animate-float rounded-full bg-fif-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 animate-float rounded-full bg-purple-500/10 blur-3xl" style={{ animationDelay: '-3s' }} />
        </>
      )}

      <div className="relative flex items-center justify-center">
        <div
          className="absolute h-28 w-28 rounded-full"
          style={{
            background: isDark
              ? 'conic-gradient(from 0deg, transparent 0deg, rgba(96,154,250,0.35) 20deg, rgba(59,130,246,0.1) 50deg, transparent 70deg)'
              : 'conic-gradient(from 0deg, transparent 0deg, rgba(59,130,246,0.25) 20deg, rgba(59,130,246,0.08) 50deg, transparent 70deg)',
            animation: 'radar-sweep 3s linear infinite',
          }}
        />

        {[
          { delay: '0s', ring: isDark ? 'border-fif-400/15' : 'border-fif-400/30' },
          { delay: '0.8s', ring: isDark ? 'border-fif-400/25' : 'border-fif-500/40' },
          { delay: '1.6s', ring: isDark ? 'border-fif-400/35' : 'border-fif-500/60' },
        ].map((r, i) => (
          <div
            key={i}
            className={`absolute h-24 w-24 rounded-full border ${r.ring}`}
            style={{ animation: `orbital-pulse 2.4s ease-out ${r.delay} infinite` }}
          />
        ))}

        <img
          src="/logo.png"
          alt="FIF"
          className="relative h-10 w-10 object-contain"
          style={{ animation: 'logo-pulse 2s ease-in-out infinite' }}
        />
      </div>

      <p
        className={`mt-6 text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
        style={{ animation: 'fade-pulse 1.5s ease-in-out infinite' }}
      >
        Memuat...
      </p>

      <style>{`
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbital-pulse {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes logo-pulse {
          0%, 100% { transform: scale(0.95); opacity: 0.85; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes fade-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
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
            <Route path="users" element={<RequireFeature feature="user_management"><SuspendedPage Component={UserManagementPage} /></RequireFeature>} />
            <Route path="permissions" element={<ProtectedRoute roles={['superadmin']}><SuspendedPage Component={PermissionManagementPage} /></ProtectedRoute>} />
            <Route path="history" element={<RequireFeature feature="broadcast_history"><SuspendedPage Component={BroadcastHistoryPage} /></RequireFeature>} />
            <Route path="settings" element={<SuspendedPage Component={SettingsPage} />} />
            <Route path="calculator" element={<SuspendedPage Component={CalculatorPage} />} />
            <Route path="templates" element={<ProtectedRoute roles={['superadmin']}><SuspendedPage Component={TemplateManagementPage} /></ProtectedRoute>} />
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
