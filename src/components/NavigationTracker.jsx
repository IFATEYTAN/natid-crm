import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/components/AuthContext';

export default function NavigationTracker() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Optional: Track navigation events here
      console.log('Navigation:', location.pathname);
    }
  }, [location, user]);

  return null;
}