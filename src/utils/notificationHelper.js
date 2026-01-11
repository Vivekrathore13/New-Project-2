import { Notification } from "../models/notification.model.js";

export const sendNotification = async ({
  userId,
  groupId = null,
  type = "INFO",
  title,
  message,
  meta = {},
}) => {
  if (!userId || !title || !message) return null;

  return Notification.create({
    userId,
    groupId,
    type,
    title,
    message,
    meta,
  });
};
