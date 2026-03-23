import {
  changePassword,
  createRole,
  createUser,
  getStaffBootstrap,
  toggleShift,
} from "../services/staff.service.js";

export async function getStaffData(req, res, next) {
  try {
    const data = await getStaffBootstrap();
    res.json({ success: true, message: "Staff data fetched successfully", data });
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

export async function postUser(req, res, next) {
  try {
    const data = await createUser(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "User created successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postPasswordReset(req, res, next) {
  try {
    const data = await changePassword(Number(req.params.id), req.body, req.user, req.ip);
    res.json({ success: true, message: "Password updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postShift(req, res, next) {
  try {
    const data = await toggleShift(req.body, req.user, req.ip);
    res.json({ success: true, message: "Shift updated successfully", data });
  } catch (error) {
    next(error);
  }
}
