import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

// VendorMobileApp is now unified with VendorPortal.
// This page exists only for backward compatibility — it redirects.
export default function VendorMobileApp() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(createPageUrl('VendorPortal'), { replace: true });
  }, [navigate]);

  return null;
}