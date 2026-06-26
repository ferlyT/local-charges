export const serializeUser = (user: any, roleName: string, permissions: string[]) => {
  return {
    id: user.fdId,
    name: user.fdNama,
    username: user.fdUsername,
    role: roleName,
    permissions: permissions,
    avatar: user.fdAvatar,
  };
};
