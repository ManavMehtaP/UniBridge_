import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { universityId } from "../config/university.js";
import { portalService } from "../services/portal.service.js";
import { asyncHandler } from "../utils/http.js";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(async (req, res) => {
  res.json(await portalService.login(String(req.body.email), String(req.body.password), req.body.role));
}));

authRouter.post("/register", asyncHandler(async (req, res) => {
  res.status(201).json(
    await portalService.register(
      req.body,
      await universityId(),
    ),
  );
}));

authRouter.post("/refresh", asyncHandler(async (req, res) => {
  res.json(await portalService.refresh(String(req.body.refreshToken)));
}));

authRouter.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  await portalService.logout(String(req.body.refreshToken));
  res.status(204).send();
}));

authRouter.post("/forgot-password", asyncHandler(async (_req, res) => {
  res.json({ message: "If this email exists, a reset link has been sent." });
}));

authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
  res.json(await portalService.me(req.user!.id, req.user!.role, req.user!.universityId));
}));
