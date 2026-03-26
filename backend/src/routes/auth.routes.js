import express from "express";
import { login, me } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/me", authenticate, me);

export default router;
