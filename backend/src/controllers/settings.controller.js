import {
  changeProfilePassword,
  getAppSettings,
  getProfile,
  updateAppSettings,
  updateProfile,
} from "../services/settings.service.js";

export async function getPublicSettings(req, res, next) {
  try {
    const data = await getAppSettings();
    res.json({ success: true, message: "App settings fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getAppCustomization(req, res, next) {
  try {
    const data = await getAppSettings();
    res.json({ success: true, message: "App customization fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function putAppCustomization(req, res, next) {
  try {
    const data = await updateAppSettings(req.body, req.user, req.ip);
    res.json({ success: true, message: "App customization updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getMyProfile(req, res, next) {
  try {
    const data = await getProfile(req.user.id);
    res.json({ success: true, message: "Profile fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function putMyProfile(req, res, next) {
  try {
    const data = await updateProfile(req.user.id, req.body, req.user, req.ip);
    res.json({ success: true, message: "Profile updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function putMyPassword(req, res, next) {
  try {
    const data = await changeProfilePassword(req.user.id, req.body, req.user, req.ip);
    res.json({ success: true, message: "Password updated successfully", data });
  } catch (error) {
    next(error);
  }
}
