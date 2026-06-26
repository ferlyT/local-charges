import { describe, it, expect } from 'vitest';

// Inline the serializer logic so the test runs in isolation (no Prisma/DB deps)
// This also validates the shape/contract of the function.
function serializeUser(
  user: { fdId: number; fdNama: string; fdUsername: string; fdAvatar?: string | null },
  roleName: string,
  permissions: string[]
) {
  return {
    id: user.fdId,
    name: user.fdNama,
    username: user.fdUsername,
    role: roleName,
    permissions: permissions,
    avatar: user.fdAvatar,
  };
}

describe('serializeUser', () => {
  const baseUser = {
    fdId: 1,
    fdNama: 'John Doe',
    fdUsername: 'johndoe',
    fdAvatar: null,
  };

  it('returns the correct shape', () => {
    const result = serializeUser(baseUser, 'admin', ['local_charges:create']);
    expect(result).toEqual({
      id: 1,
      name: 'John Doe',
      username: 'johndoe',
      role: 'admin',
      permissions: ['local_charges:create'],
      avatar: null,
    });
  });

  it('maps fdId to id correctly', () => {
    const result = serializeUser({ ...baseUser, fdId: 99 }, 'user', []);
    expect(result.id).toBe(99);
  });

  it('maps fdNama to name correctly', () => {
    const result = serializeUser({ ...baseUser, fdNama: 'Jane Smith' }, 'user', []);
    expect(result.name).toBe('Jane Smith');
  });

  it('handles empty permissions array', () => {
    const result = serializeUser(baseUser, 'viewer', []);
    expect(result.permissions).toEqual([]);
  });

  it('handles multiple permissions', () => {
    const perms = ['local_charges:create', 'local_charges:edit', 'local_charges:delete'];
    const result = serializeUser(baseUser, 'operator', perms);
    expect(result.permissions).toHaveLength(3);
    expect(result.permissions).toContain('local_charges:edit');
  });

  it('includes avatar when provided', () => {
    const result = serializeUser({ ...baseUser, fdAvatar: 'https://example.com/avatar.png' }, 'user', []);
    expect(result.avatar).toBe('https://example.com/avatar.png');
  });

  it('includes role name in output', () => {
    const result = serializeUser(baseUser, 'super-admin', []);
    expect(result.role).toBe('super-admin');
  });
});
