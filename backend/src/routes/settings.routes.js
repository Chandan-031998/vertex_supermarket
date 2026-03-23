import { Router } from "express";
import {
  getAppCustomization,
  getMyProfile,
  getPublicSettings,
  putAppCustomization,
  putMyPassword,
  putMyProfile,
} from "../controllers/settings.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

// Public app/login branding settings
router.get("/public", getPublicSettings);

// App customization
router.get(
  "/app",
  authenticate,
  requirePermission("settings.view", "customization.view"),
  getAppCustomization
);

router.put(
  "/app",
  authenticate,
  requirePermission("settings.manage", "customization.manage"),
  putAppCustomization
);

// My profile
router.get(
  "/profile",
  authenticate,
  requirePermission("profile.view", "profile.edit"),
  getMyProfile
);

router.put(
  "/profile",
  authenticate,
  requirePermission("profile.edit"),
  putMyProfile
);

router.put(
  "/profile/password",
  authenticate,
  requirePermission("profile.edit"),
  putMyPassword
);

export default router;