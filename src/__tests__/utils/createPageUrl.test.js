import { describe, it, expect } from 'vitest';
import { createPageUrl } from '@/utils';

describe('createPageUrl', () => {
  it('should create a URL path from page name', () => {
    expect(createPageUrl('Dashboard')).toBe('/Dashboard');
  });

  it('should replace spaces with hyphens', () => {
    expect(createPageUrl('Service Providers')).toBe('/Service-Providers');
  });

  it('should handle single word page names', () => {
    expect(createPageUrl('Settings')).toBe('/Settings');
  });

  it('should handle page names with multiple spaces', () => {
    expect(createPageUrl('New Service Call')).toBe('/New-Service-Call');
  });

  it('should handle known page names used in the app', () => {
    expect(createPageUrl('ServiceProviders')).toBe('/ServiceProviders');
    expect(createPageUrl('VendorProfile')).toBe('/VendorProfile');
    expect(createPageUrl('NewVendor')).toBe('/NewVendor');
    expect(createPageUrl('EditVendor')).toBe('/EditVendor');
  });
});
