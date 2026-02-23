import { describe, it, expect } from 'vitest';
import {
  NAVIGATION_GROUPS,
  getExpectedNavItems,
  getBlockedNavItems,
  createCanAccessPage,
} from './testHelpers.jsx';

/**
 * Tests that the navigation sidebar shows the correct items for each role.
 * This simulates what Layout.jsx does: iterate navigationGroups and call
 * canAccessPage(item.href) - if false, the item is not rendered.
 */

describe('Navigation visibility by role', () => {
  // ─── Admin sees everything ───────────────────────────────

  describe('Admin navigation', () => {
    const visible = getExpectedNavItems('admin');
    const blocked = getBlockedNavItems('admin');
    const allItems = NAVIGATION_GROUPS.flatMap((g) => g.items.map((i) => i.name));

    it('should see ALL navigation items', () => {
      expect(visible).toEqual(allItems);
    });

    it('should have no blocked items', () => {
      expect(blocked).toHaveLength(0);
    });

    it('should see system management items', () => {
      expect(visible).toContain('ניהול משתמשים');
      expect(visible).toContain('ניהול תפקידים');
      expect(visible).toContain('יומן פעולות');
      expect(visible).toContain('הגדרות מערכת');
    });

    it('should see financial items', () => {
      expect(visible).toContain('חשבוניות');
      expect(visible).toContain('תעריפון תפעול');
      expect(visible).toContain('הסכמי תמחור');
    });

    it('should see vendor portal', () => {
      expect(visible).toContain('פורטל ספקים');
    });
  });

  // ─── Operator sees operational items ─────────────────────

  describe('Operator navigation', () => {
    const visible = getExpectedNavItems('operator');
    const blocked = getBlockedNavItems('operator');

    it('should see daily operation items', () => {
      expect(visible).toContain('מסך הבית');
      expect(visible).toContain('לוח בקרה');
      expect(visible).toContain('רשימת קריאות');
      expect(visible).toContain('לוח שנה');
      expect(visible).toContain('ניטור תורים');
    });

    it('should see vendor management items (except pricing)', () => {
      expect(visible).toContain('נותני שירות');
      expect(visible).toContain('חוזי ספקים');
      expect(visible).toContain('מפת ספקים');
      expect(visible).toContain('אזורי כיסוי');
    });

    it('should see reports and customer items', () => {
      expect(visible).toContain('דוחות');
      expect(visible).toContain('לקוחות');
      expect(visible).toContain('משובי לקוחות');
      expect(visible).toContain('הפרופיל שלי');
    });

    it('should NOT see admin-only system items', () => {
      expect(blocked).toContain('ניהול משתמשים');
      expect(blocked).toContain('ניהול תפקידים');
      expect(blocked).toContain('יומן פעולות');
      expect(blocked).toContain('אינטגרציות CRM');
      expect(blocked).toContain('הגדרות תצוגה');
      expect(blocked).toContain('הגדרות מערכת');
    });

    it('should NOT see financial items (admin-only)', () => {
      expect(blocked).toContain('חשבוניות');
      expect(blocked).toContain('תעריפון תפעול');
      expect(blocked).toContain('הסכמי תמחור');
    });

    it('should NOT see vendor portal (vendor-only)', () => {
      expect(blocked).toContain('פורטל ספקים');
    });

    it('should NOT see fleet management (admin-only)', () => {
      expect(blocked).toContain('ניהול צי רכב');
    });
  });

  // ─── Vendor sees only vendor portal items ────────────────

  describe('Vendor navigation', () => {
    const visible = getExpectedNavItems('vendor');
    const blocked = getBlockedNavItems('vendor');

    it('should see vendor portal', () => {
      expect(visible).toContain('פורטל ספקים');
    });

    it('should see landing page and profile', () => {
      expect(visible).toContain('מסך הבית');
      expect(visible).toContain('הפרופיל שלי');
    });

    it('should NOT see daily operations (admin+operator)', () => {
      expect(blocked).toContain('לוח בקרה');
      expect(blocked).toContain('רשימת קריאות');
      expect(blocked).toContain('לוח שנה');
      expect(blocked).toContain('ניטור תורים');
    });

    it('should NOT see vendor management items (admin+operator manage vendors, vendors use portal)', () => {
      expect(blocked).toContain('נותני שירות');
      expect(blocked).toContain('חוזי ספקים');
      expect(blocked).toContain('מפת ספקים');
    });

    it('should NOT see any system items', () => {
      expect(blocked).toContain('ניהול משתמשים');
      expect(blocked).toContain('הגדרות מערכת');
    });

    it('should NOT see reports', () => {
      expect(blocked).toContain('דוחות');
      expect(blocked).toContain('לקוחות');
    });

    it('should NOT see financial items', () => {
      expect(blocked).toContain('חשבוניות');
      expect(blocked).toContain('תעריפון תפעול');
    });

    it('visible items should be a small subset of total', () => {
      const allItems = NAVIGATION_GROUPS.flatMap((g) => g.items);
      expect(visible.length).toBeLessThan(allItems.length / 2);
    });
  });

  // ─── Agent sees minimal items ────────────────────────────

  describe('Agent navigation', () => {
    const visible = getExpectedNavItems('agent');
    const blocked = getBlockedNavItems('agent');

    it('should see landing page and profile', () => {
      expect(visible).toContain('מסך הבית');
      expect(visible).toContain('הפרופיל שלי');
    });

    it('should NOT see dashboard or calls', () => {
      expect(blocked).toContain('לוח בקרה');
      expect(blocked).toContain('רשימת קריאות');
    });

    it('should NOT see any vendor management items', () => {
      expect(blocked).toContain('נותני שירות');
      expect(blocked).toContain('פורטל ספקים');
    });

    it('should NOT see reports or customers', () => {
      expect(blocked).toContain('דוחות');
      expect(blocked).toContain('לקוחות');
    });

    it('should NOT see any system items', () => {
      expect(blocked).toContain('ניהול משתמשים');
      expect(blocked).toContain('הגדרות מערכת');
    });

    it('should have the least number of visible items', () => {
      const adminVisible = getExpectedNavItems('admin');
      const operatorVisible = getExpectedNavItems('operator');
      const vendorVisible = getExpectedNavItems('vendor');

      expect(visible.length).toBeLessThanOrEqual(vendorVisible.length);
      expect(visible.length).toBeLessThan(operatorVisible.length);
      expect(visible.length).toBeLessThan(adminVisible.length);
    });
  });
});

// ─── Cross-role comparison tests ───────────────────────────

describe('Navigation: cross-role comparison', () => {
  it('admin sees strictly more items than operator', () => {
    const adminItems = new Set(getExpectedNavItems('admin'));
    const operatorItems = getExpectedNavItems('operator');

    for (const item of operatorItems) {
      expect(adminItems.has(item)).toBe(true);
    }
    expect(adminItems.size).toBeGreaterThan(operatorItems.length);
  });

  it('admin sees strictly more items than vendor', () => {
    const adminItems = new Set(getExpectedNavItems('admin'));
    const vendorItems = getExpectedNavItems('vendor');

    for (const item of vendorItems) {
      expect(adminItems.has(item)).toBe(true);
    }
    expect(adminItems.size).toBeGreaterThan(vendorItems.length);
  });

  it('operator and vendor have no overlapping operational pages', () => {
    const operatorItems = getExpectedNavItems('operator');
    const vendorItems = getExpectedNavItems('vendor');
    const allRolesNames = ['מסך הבית', 'הפרופיל שלי']; // shared items

    const operatorOnly = operatorItems.filter((i) => !allRolesNames.includes(i));
    const vendorOnly = vendorItems.filter((i) => !allRolesNames.includes(i));

    // No operational overlap
    for (const item of vendorOnly) {
      expect(operatorOnly).not.toContain(item);
    }
  });

  it('every nav item is accessible by at least one role', () => {
    const allItems = NAVIGATION_GROUPS.flatMap((g) => g.items);
    const roles = ['admin', 'operator', 'vendor', 'agent'];

    for (const item of allItems) {
      const accessibleBy = roles.filter((role) => {
        const canAccessPage = createCanAccessPage(role);
        return canAccessPage(item.href);
      });
      expect(accessibleBy.length).toBeGreaterThan(0);
    }
  });
});
