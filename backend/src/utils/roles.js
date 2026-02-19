const ROLE_RANK = {
  worker: 1,
  manager: 2,
  admin: 3,
  super_admin: 4
};

const hasRequiredRole = (userRole, requiredRole) => {
  return (ROLE_RANK[userRole] || 0) >= (ROLE_RANK[requiredRole] || 999);
};

const hasAnyRequiredRole = (userRole, requiredRoles = []) => {
  return requiredRoles.some((role) => hasRequiredRole(userRole, role));
};

module.exports = {
  ROLE_RANK,
  hasRequiredRole,
  hasAnyRequiredRole
};
