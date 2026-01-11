import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  getMyNotifications,
  markNotificationRead,
  markAllRead,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(verifyJWT);

router.get("/", getMyNotifications);
router.patch("/:notificationId/read", markNotificationRead);
router.patch("/read-all", markAllRead);

export default router;
