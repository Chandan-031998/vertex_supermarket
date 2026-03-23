import { AppError } from "../utils/appError.js";

const normalizeRole = (role) =>
  String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export function authorize(...roles) {
  return (req, res, next) => {
    const userRole = normalizeRole(req.user?.role);
    const allowedRoles = roles.map(normalizeRole);

    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(new AppError("Forbidden", 403));
    }
    next();
  };
}
