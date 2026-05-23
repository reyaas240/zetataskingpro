import { db } from "./db";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  taskId?: string;
}

export async function createNotification({
  userId,
  title,
  message,
  taskId,
}: CreateNotificationParams) {
  try {
    return await db.notification.create({
      data: {
        userId,
        title,
        message,
        taskId,
        isRead: false,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}
