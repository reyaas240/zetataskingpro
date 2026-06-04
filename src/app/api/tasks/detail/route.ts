import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Fetch details of a single task
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

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, email: true, avatarUrl: true } },
        epic: true,
        sprint: true,
        project: true,
        watchers: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, email: true } }
          }
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        attachments: true,
        outgoingLinks: { include: { targetTask: true } },
        incomingLinks: { include: { sourceTask: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify membership
    const membership = await db.organizationMember.findFirst({
      where: {
        userId: user.id,
        organization: {
          projects: {
            some: { id: task.projectId },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
