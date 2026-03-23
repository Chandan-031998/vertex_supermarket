import { getPermissionCatalog } from "../services/permission.service.js";

export async function getPermissionsCatalog(req, res, next) {
  try {
    const data = await getPermissionCatalog();
    res.json({ success: true, message: "Permission catalog fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getMyPermissions(req, res, next) {
  try {
    const data = req.user.permissions || [];
    res.json({ success: true, message: "Current permissions fetched successfully", data });
  } catch (error) {
    next(error);
  }
}
