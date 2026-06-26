export const hasPermission = (user: any, requiredPermission: string): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!user.permissions) return false;
  return user.permissions.includes(requiredPermission);
};
