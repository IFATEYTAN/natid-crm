import { describe, it, expect } from 'vitest';

/**
 * resolveEffectiveRole is defined inside PermissionsContext.jsx.
 * Since it's a pure function, we replicate the exact logic here to test it in isolation.
 * If the logic in PermissionsContext changes, this test must be updated accordingly.
 */

const APP_ROLE_MAP = {
  admin: 'admin',
  operator: 'operator',
  agent: 'agent',
  vendor: 'vendor',
  manager: 'operator',
  מנהל: 'admin',
  'מנהל מערכת': 'admin',
  מוקדן: 'operator',
  מתפעל: 'operator',
  'מנהל תפעול': 'operator',
  טכנאי: 'agent',
  'נציג שטח': 'agent',
  ספק: 'vendor',
  'ספק שירות': 'vendor',
};

function resolveEffectiveRole(platformRole, userPermission) {
  if (platformRole === 'admin') return 'admin';
  if (platformRole === 'vendor') return 'vendor';

  if (userPermission?.roleData?.name) {
    const mapped = APP_ROLE_MAP[userPermission.roleData.name];
    if (mapped) return mapped;
  }
  if (userPermission?.roleData?.display_name) {
    const mapped = APP_ROLE_MAP[userPermission.roleData.display_name];
    if (mapped) return mapped;
  }

  if (userPermission?.role_name) {
    const mapped = APP_ROLE_MAP[userPermission.role_name];
    if (mapped) return mapped;
  }

  if (APP_ROLE_MAP[platformRole]) return APP_ROLE_MAP[platformRole];

  return 'operator';
}

describe('resolveEffectiveRole', () => {
  describe('platform role direct mapping', () => {
    it('should map platform "admin" to admin', () => {
      expect(resolveEffectiveRole('admin', null)).toBe('admin');
    });

    it('should map platform "admin" even when UserPermission says otherwise', () => {
      expect(resolveEffectiveRole('admin', { roleData: { name: 'operator' } })).toBe('admin');
    });

    it('should map platform "vendor" to vendor', () => {
      expect(resolveEffectiveRole('vendor', null)).toBe('vendor');
    });

    it('should map platform "vendor" even when UserPermission says otherwise', () => {
      expect(resolveEffectiveRole('vendor', { roleData: { name: 'admin' } })).toBe('vendor');
    });
  });

  describe('Role entity name mapping (roleData.name)', () => {
    it('should resolve "operator" from roleData.name', () => {
      expect(resolveEffectiveRole('user', { roleData: { name: 'operator' } })).toBe('operator');
    });

    it('should resolve "agent" from roleData.name', () => {
      expect(resolveEffectiveRole('user', { roleData: { name: 'agent' } })).toBe('agent');
    });

    it('should resolve "manager" as operator from roleData.name', () => {
      expect(resolveEffectiveRole('user', { roleData: { name: 'manager' } })).toBe('operator');
    });
  });

  describe('Role entity display_name mapping (Hebrew)', () => {
    it('should resolve "מנהל" (admin in Hebrew) to admin', () => {
      expect(resolveEffectiveRole('user', { roleData: { display_name: 'מנהל' } })).toBe('admin');
    });

    it('should resolve "מנהל מערכת" to admin', () => {
      expect(resolveEffectiveRole('user', { roleData: { display_name: 'מנהל מערכת' } })).toBe(
        'admin'
      );
    });

    it('should resolve "מוקדן" to operator', () => {
      expect(resolveEffectiveRole('user', { roleData: { display_name: 'מוקדן' } })).toBe(
        'operator'
      );
    });

    it('should resolve "מתפעל" to operator', () => {
      expect(resolveEffectiveRole('user', { roleData: { display_name: 'מתפעל' } })).toBe(
        'operator'
      );
    });

    it('should resolve "מנהל תפעול" to operator', () => {
      expect(resolveEffectiveRole('user', { roleData: { display_name: 'מנהל תפעול' } })).toBe(
        'operator'
      );
    });

    it('should resolve "טכנאי" to agent', () => {
      expect(resolveEffectiveRole('user', { roleData: { display_name: 'טכנאי' } })).toBe('agent');
    });

    it('should resolve "נציג שטח" to agent', () => {
      expect(resolveEffectiveRole('user', { roleData: { display_name: 'נציג שטח' } })).toBe(
        'agent'
      );
    });

    it('should resolve "ספק" to vendor', () => {
      expect(resolveEffectiveRole('user', { roleData: { display_name: 'ספק' } })).toBe('vendor');
    });

    it('should resolve "ספק שירות" to vendor', () => {
      expect(resolveEffectiveRole('user', { roleData: { display_name: 'ספק שירות' } })).toBe(
        'vendor'
      );
    });
  });

  describe('role_name fallback from UserPermission', () => {
    it('should resolve from role_name when roleData is absent', () => {
      expect(resolveEffectiveRole('user', { role_name: 'טכנאי' })).toBe('agent');
    });

    it('should resolve from role_name when roleData has no known name', () => {
      expect(
        resolveEffectiveRole('user', {
          roleData: { name: 'unknown_role', display_name: 'Unknown' },
          role_name: 'מוקדן',
        })
      ).toBe('operator');
    });
  });

  describe('platform role fallback via APP_ROLE_MAP', () => {
    it('should map platform "operator" directly', () => {
      expect(resolveEffectiveRole('operator', null)).toBe('operator');
    });

    it('should map platform "agent" directly', () => {
      expect(resolveEffectiveRole('agent', null)).toBe('agent');
    });

    it('should map platform "manager" to operator', () => {
      expect(resolveEffectiveRole('manager', null)).toBe('operator');
    });
  });

  describe('default fallback', () => {
    it('should default to operator for platform role "user"', () => {
      expect(resolveEffectiveRole('user', null)).toBe('operator');
    });

    it('should default to operator for unknown platform role', () => {
      expect(resolveEffectiveRole('unknown', null)).toBe('operator');
    });

    it('should default to operator for undefined platform role', () => {
      expect(resolveEffectiveRole(undefined, null)).toBe('operator');
    });

    it('should default to operator for null inputs', () => {
      expect(resolveEffectiveRole(null, null)).toBe('operator');
    });
  });

  describe('priority order', () => {
    it('roleData.name takes priority over roleData.display_name', () => {
      expect(
        resolveEffectiveRole('user', {
          roleData: { name: 'agent', display_name: 'מוקדן' },
        })
      ).toBe('agent');
    });

    it('roleData.display_name takes priority over role_name', () => {
      expect(
        resolveEffectiveRole('user', {
          roleData: { display_name: 'ספק' },
          role_name: 'מוקדן',
        })
      ).toBe('vendor');
    });

    it('role_name takes priority over platform role mapping', () => {
      expect(resolveEffectiveRole('manager', { role_name: 'טכנאי' })).toBe('agent');
    });
  });
});
