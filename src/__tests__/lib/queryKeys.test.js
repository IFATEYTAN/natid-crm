import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/queryKeys';

describe('queryKeys', () => {
  it('should have all expected feature key groups', () => {
    expect(queryKeys).toHaveProperty('calls');
    expect(queryKeys).toHaveProperty('cases');
    expect(queryKeys).toHaveProperty('customers');
    expect(queryKeys).toHaveProperty('vendors');
    expect(queryKeys).toHaveProperty('users');
    expect(queryKeys).toHaveProperty('queue');
    expect(queryKeys).toHaveProperty('notifications');
    expect(queryKeys).toHaveProperty('messages');
    expect(queryKeys).toHaveProperty('activities');
    expect(queryKeys).toHaveProperty('callPhotos');
    expect(queryKeys).toHaveProperty('assignmentAttempts');
    expect(queryKeys).toHaveProperty('reports');
    expect(queryKeys).toHaveProperty('serviceProviders');
    expect(queryKeys).toHaveProperty('settings');
    expect(queryKeys).toHaveProperty('auth');
  });

  describe('calls keys', () => {
    it('should return unique keys', () => {
      expect(queryKeys.calls.all()).toEqual(['calls']);
      expect(queryKeys.calls.detail('123')).toEqual(['calls', '123']);
      expect(queryKeys.calls.list({ status: 'open' })).toEqual([
        'calls',
        { filters: { status: 'open' } },
      ]);
    });

    it('detail keys should differ for different IDs', () => {
      expect(queryKeys.calls.detail('1')).not.toEqual(queryKeys.calls.detail('2'));
    });
  });

  describe('vendors keys', () => {
    it('should return unique keys', () => {
      expect(queryKeys.vendors.all()).toEqual(['vendors']);
      expect(queryKeys.vendors.detail('v1')).toEqual(['vendors', 'v1']);
      expect(queryKeys.vendors.available()).toEqual(['vendors', 'available']);
    });

    it('should have vendor sub-resource keys', () => {
      expect(queryKeys.vendors.ratings('v1')).toEqual(['vendors', 'v1', 'ratings']);
      expect(queryKeys.vendors.payments('v1')).toEqual(['vendors', 'v1', 'payments']);
      expect(queryKeys.vendors.contracts('v1')).toEqual(['vendors', 'v1', 'contracts']);
      expect(queryKeys.vendors.locations('v1')).toEqual(['vendors', 'v1', 'locations']);
    });
  });

  describe('customers keys', () => {
    it('should return unique keys', () => {
      expect(queryKeys.customers.all()).toEqual(['customers']);
      expect(queryKeys.customers.detail('c1')).toEqual(['customers', 'c1']);
      expect(queryKeys.customers.interactions('c1')).toEqual(['customers', 'c1', 'interactions']);
    });
  });

  describe('key uniqueness across features', () => {
    it('all() keys should not collide between features', () => {
      const allKeys = [
        queryKeys.calls.all(),
        queryKeys.cases.all(),
        queryKeys.customers.all(),
        queryKeys.vendors.all(),
        queryKeys.users.all(),
        queryKeys.queue.all(),
        queryKeys.notifications.all(),
      ];

      const serialized = allKeys.map((k) => JSON.stringify(k));
      const unique = new Set(serialized);
      expect(unique.size).toBe(allKeys.length);
    });
  });
});
