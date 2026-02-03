import { Suspense, useEffect, useState } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppAccessDeniedError from '@/components/AppAccessDeniedError';
import ErrorBoundary from '@/components/ErrorBoundary';
import RoleGuard from '@/components/auth/RoleGuard';
import { getPageRoles } from '@/config/permissions';
import { base44 } from '@/lib/api';

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin"></div>
  </div>
);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => {
  // Login page should not have Layout (no sidebar)
  if (currentPageName === 'Login') {
    return <>{children}</>;
  }

  return Layout ?
    <Layout currentPageName={currentPageName}>{children}</Layout>
    : <>{children}</>;
};

const PlatformLoginRedirect = () => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Prevent infinite redirect: if we already redirected recently, show fallback
    const lastRedirect = sessionStorage.getItem('auth_redirect_time');
    const now = Date.now();
    if (lastRedirect && (now - parseInt(lastRedirect)) < 10000) {
      setShowFallback(true);
      return;
    }
    sessionStorage.setItem('auth_redirect_time', now.toString());
    try {
      base44.auth.redirectToLogin(window.location.origin);
    } catch (e) {
      console.error('redirectToLogin failed:', e);
      setShowFallback(true);
    }
  }, []);

  if (showFallback) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="max-w-md text-center p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">נדרשת התחברות</h1>
          <p className="text-gray-600 mb-6">
            יש להתחבר דרך מערכת base44 כדי לגשת לאפליקציה.
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem('auth_redirect_time');
              base44.auth.redirectToLogin(window.location.origin);
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            התחבר / הרשם
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated, authError } = useAuth();

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
      return <PlatformLoginRedirect />;
    } else {
      // Handle app_private, unknown, and other error types
      return <AppAccessDeniedError />;
    }
  }

  // Safety net: if not authenticated and no explicit error, redirect to login
  if (!isAuthenticated) {
    return <PlatformLoginRedirect />;
  }

  // Render the main app with role-based access control
  const renderPage = (pageName, Page) => {
    const roles = getPageRoles(pageName);
    const content = (
      <Suspense fallback={<PageLoader />}>
        <Page />
      </Suspense>
    );

    // If page has role restrictions, wrap with RoleGuard
    if (roles) {
      return <RoleGuard allowedRoles={roles}>{content}</RoleGuard>;
    }
    return content;
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            {renderPage(mainPageKey, MainPage)}
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                {renderPage(path, Page)}
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
