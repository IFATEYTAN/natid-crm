import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import {
  login as srvLogin,
  fetchMe,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from '@/lib/srvAuth';
import { setUnauthorizedHandler } from '@/lib/srvClient';
import { isDemoMode } from '@/demo/demoMode';
import { demoUser } from '@/demo/demoData';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const checkExistingSession = useCallback(async () => {
    // Demo mode: skip real auth, use demo user immediately
    if (isDemoMode()) {
      setUser(demoUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      return;
    }

    try {
      const me = await fetchMe();
      setUser(me);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Session check failed:', error);
      // The stored token didn't pass /me (expired, revoked role, deactivated
      // account) — drop it so the next load starts clean instead of retrying
      // a token that will keep failing.
      clearStoredToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  const login = useCallback(async (username, password) => {
    const { access_token, user: loggedInUser } = await srvLogin(username, password);
    setStoredToken(access_token);
    setUser(loggedInUser);
    setIsAuthenticated(true);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Closes the gap a mid-session 401 used to fall into: any srv request
  // (not just the /me check at boot) now logs the user out. Registered here
  // rather than imported by srvClient directly, which would create a cycle.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Re-fetches /me with the current token so a profile/role change is
  // reflected without forcing a re-login. No-ops in demo mode (no real token).
  const refreshUser = useCallback(async () => {
    if (isDemoMode()) return;
    const token = getStoredToken();
    if (!token) return;
    try {
      const me = await fetchMe();
      setUser(me);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Return safe defaults instead of throwing to prevent cascading failures
    // when components render briefly outside the provider during error recovery.
    return {
      user: null,
      isAuthenticated: false,
      isLoadingAuth: true,
      login: async () => {
        throw new Error('AuthProvider not mounted');
      },
      logout: () => {},
      refreshUser: async () => {},
    };
  }
  return context;
};
