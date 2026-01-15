import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  getMyNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
} from "../controllers/notification.controllers.js";

const router = Router();

router.use(verifyJWT);

// ✅ IMPORTANT: static routes FIRST
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllRead);

// ✅ then dynamic routes
router.get("/", getMyNotifications);
router.patch("/:notificationId/read", markNotificationRead);
router.delete("/:notificationId", deleteNotification);

export default router;
