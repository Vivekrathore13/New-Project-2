import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Notification } from "../models/notification.model.js";
import mongoose from "mongoose";

// ✅ Get My Notifications
export const getMyNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized User");

  const list = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50);

  return res
    .status(200)
    .json(new ApiResponse(200, list, "Notifications fetched successfully"));
});

// ✅ Mark as Read
export const markNotificationRead = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { notificationId } = req.params;

  if (!userId) throw new ApiError(401, "Unauthorized User");

  if (!notificationId || !mongoose.isValidObjectId(notificationId)) {
    throw new ApiError(400, "Invalid notificationId");
  }

  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!updated) throw new ApiError(404, "Notification not found");

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Marked as read"));
});

// ✅ Mark all as read
export const markAllRead = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized User");

  await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "All notifications marked as read"));
});
