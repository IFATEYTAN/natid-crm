/**
 * Pages whose data now comes from srv.natid.co.il (real Nati data) instead
 * of base44, per the srv dispatcher-rebuild plan. Base44 platform login was
 * removed when Nati-credential auth landed, so every page NOT in this set
 * still calls base44.entities/functions that no longer authenticate — hide
 * their nav links rather than exposing a screen that will just error.
 *
 * Update this set as each screen's Phase migrates (see the plan's phase
 * tables). Direct navigation to an unmigrated page's URL still works, since
 * hiding the link is about nav hygiene, not access control.
 */
export const SRV_MIGRATED_PAGES = new Set([
  'LandingPage',
  'Calls',
  'CallDetails',
  'Customers',
  'CustomerDetails',
  'ServiceProviders',
  'VendorDetails',
  'NewCase',
  'ProductCatalog',
  'UserManagement',
  'RoleManagement',
]);
