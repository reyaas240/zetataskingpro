import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

// GET: Fetch comments for a task
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const taskId = url.searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const comments = await db.comment.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ comments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add comment to task
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, taskId, attachments } = body;

    if (!content || !taskId) {
      return NextResponse.json({ error: "Content and Task ID are required" }, { status: 400 });
    }

    // Verify task exists
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify membership
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: task.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comment = await db.comment.create({
      data: {
        content,
        taskId,
        userId: user.id,
        attachments: attachments || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Notify assignee
    if (task.assigneeId && task.assigneeId !== user.id) {
      await createNotification({
        userId: task.assigneeId,
        title: "New Comment",
        message: `${user.name} commented on task ${task.code}: "${content.length > 50 ? content.substring(0, 50) + '...' : content}"`,
        taskId: task.id,
      });
    }

    // Notify reporter (if not the commenter and not already notified as assignee)
    if (task.reporterId && task.reporterId !== user.id && task.reporterId !== task.assigneeId) {
      await createNotification({
        userId: task.reporterId,
        title: "New Comment",
        message: `${user.name} commented on task ${task.code}: "${content.length > 50 ? content.substring(0, 50) + '...' : content}"`,
        taskId: task.id,
      });
    }

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
