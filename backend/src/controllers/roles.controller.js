import {
  assignUserToRole,
  createRole,
  deleteRole,
  getRoleById,
  getRolePermissionMatrix,
  listRoles,
  saveRolePermissions,
  updateRole,
} from "../services/roles.service.js";

export async function getRoles(req, res, next) {
  try {
    const data = await listRoles();
    res.json({ success: true, message: "Roles fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getRole(req, res, next) {
  try {
    const data = await getRoleById(Number(req.params.id));
    res.json({ success: true, message: "Role fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postRole(req, res, next) {
  try {
    const data = await createRole(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Role created successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function putRole(req, res, next) {
  try {
    const data = await updateRole(Number(req.params.id), req.body, req.user, req.ip);
    res.json({ success: true, message: "Role updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function removeRole(req, res, next) {
  try {
    const data = await deleteRole(Number(req.params.id), req.user, req.ip);
    res.json({ success: true, message: "Role deleted successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getRolePermissions(req, res, next) {
  try {
    const data = await getRolePermissionMatrix(Number(req.params.id));
    res.json({ success: true, message: "Role permissions fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function putRolePermissions(req, res, next) {
  try {
    const data = await saveRolePermissions(Number(req.params.id), req.body.permission_keys ?? req.body.permissionKeys ?? [], req.user, req.ip);
    res.json({ success: true, message: "Role permissions updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postAssignUserRole(req, res, next) {
  try {
    const data = await assignUserToRole(Number(req.params.id), Number(req.body.user_id ?? req.body.userId), req.user, req.ip);
    res.json({ success: true, message: "User role updated successfully", data });
  } catch (error) {
    next(error);
  }
}
