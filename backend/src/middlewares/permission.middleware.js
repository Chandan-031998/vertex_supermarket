export function requirePermission(...permissionKeys) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!permissionKeys.length) {
      return next();
    }

    const allowed = new Set(req.user.permissions || []);
    const hasAccess = permissionKeys.some((key) => allowed.has(key));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    return next();
  };
}
