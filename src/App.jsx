import { Suspense } from 'react';
import { lazyRetry } from '@/lib/lazyRetry';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import NavigationTracker from '@/lib/NavigationTracker';
import { pagesConfig } from './pages.config';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppAccessDeniedError from '@/components/AppAccessDeniedError';
import ErrorBoundary from '@/components/ErrorBoundary';
import RoleGuard from '@/components/auth/RoleGuard';
import { getPageRoles } from '@/config/permissions';
import DemoBanner from '@/demo/DemoBanner';

const LandingPage = lazyRetry(() => import('@/pages/LandingPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin"></div>
  </div>
);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const noLayoutPages = ['Login', 'LandingPage'];

const LayoutWrapper = ({ children, currentPageName }) => {
  if (noLayoutPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  return Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;
};

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, isAuthenticated, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return (
        <Suspense fallback={<PageLoader />}>
          <LandingPage />
        </Suspense>
      );
    } else {
      return <AppAccessDeniedError />;
    }
  }

  // Not authenticated — show landing page
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    );
  }

  // Render the main app with role-based access control
  // Pages without Layout (noLayoutPages) skip RoleGuard because
  // PermissionsProvider lives inside Layout and is not available for them.
  const renderPage = (pageName, Page) => {
    const content = (
      <Suspense fallback={<PageLoader />}>
        <Page />
      </Suspense>
    );

    if (noLayoutPages.includes(pageName)) {
      return content;
    }

    const roles = getPageRoles(pageName);
    if (roles) {
      return <RoleGuard allowedRoles={roles}>{content}</RoleGuard>;
    }
    return content;
  };

  // Determine main page dynamically based on user role
  const userRole = (user?.role || '').toLowerCase().trim();
  const isVendor = userRole === 'vendor' || userRole === 'ספק';
  console.log("App Main Page user role:", userRole, "isVendor:", isVendor);
  const effectiveMainPageKey = isVendor ? 'VendorPortal' : mainPageKey;
  const EffectiveMainPage = Pages[effectiveMainPageKey] || MainPage;

  return (
    <Suspense fallback={<PageLoader />}>
      <NavigationTracker />
      <Routes>
        <Route
          path="/"
          element={
            <LayoutWrapper currentPageName={effectiveMainPageKey}>
              {renderPage(effectiveMainPageKey, EffectiveMainPage)}
            </LayoutWrapper>
          }
        />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={<LayoutWrapper currentPageName={path}>{renderPage(path, Page)}</LayoutWrapper>}
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <DemoBanner />
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ErrorBoundary>
            <AuthenticatedApp />
          </ErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;