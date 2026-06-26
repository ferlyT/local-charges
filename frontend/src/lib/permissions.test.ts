import { describe, it, expect } from 'vitest';
import { hasPermission } from '../lib/permissions';

describe('hasPermission', () => {
  it('returns false if user is null or undefined', () => {
    expect(hasPermission(null, 'local_charges:create')).toBe(false);
    expect(hasPermission(undefined, 'local_charges:create')).toBe(false);
  });

  it('returns true for admin users for any permission', () => {
    const adminUser = { role: 'admin', permissions: [] };
    expect(hasPermission(adminUser, 'local_charges:create')).toBe(true);
    expect(hasPermission(adminUser, 'users:manage')).toBe(true);
    expect(hasPermission(adminUser, 'any:permission')).toBe(true);
  });

  it('returns false for users without the required permission', () => {
    const user = { role: 'user', permissions: ['local_charges:view'] };
    expect(hasPermission(user, 'local_charges:create')).toBe(false);
    expect(hasPermission(user, 'users:manage')).toBe(false);
  });

  it('returns true for users with the exact required permission', () => {
    const user = { role: 'operator', permissions: ['local_charges:create', 'local_charges:edit'] };
    expect(hasPermission(user, 'local_charges:create')).toBe(true);
    expect(hasPermission(user, 'local_charges:edit')).toBe(true);
  });

  it('returns false if user has empty permissions array', () => {
    const user = { role: 'viewer', permissions: [] };
    expect(hasPermission(user, 'local_charges:view')).toBe(false);
  });

  it('returns false if permissions field is missing', () => {
    const user = { role: 'viewer' };
    expect(hasPermission(user, 'local_charges:view')).toBe(false);
  });
});
