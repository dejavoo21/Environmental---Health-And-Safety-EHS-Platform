const ROLE_RANK = {
  worker: 1,
  manager: 2,
  admin: 3,
  super_admin: 4
};

export const hasRole = (userRole, requiredRole) => {
  return (ROLE_RANK[userRole] || 0) >= (ROLE_RANK[requiredRole] || 999);
};

export const hasAnyRole = (userRole, roles = []) => {
  return roles.some((role) => hasRole(userRole, role));
};
