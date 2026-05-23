import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Fetch links for a task
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

    const links = await db.taskLink.findMany({
      where: {
        OR: [
          { sourceTaskId: taskId },
          { targetTaskId: taskId },
        ],
      },
      include: {
        sourceTask: true,
        targetTask: true,
      },
    });

    return NextResponse.json({ links });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Link two tasks
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sourceTaskId, targetTaskId, type } = body;

    if (!sourceTaskId || !targetTaskId || !type) {
      return NextResponse.json(
        { error: "Source Task ID, Target Task ID, and Link Type are required" },
        { status: 400 }
      );
    }

    if (sourceTaskId === targetTaskId) {
      return NextResponse.json({ error: "Cannot link a task to itself" }, { status: 400 });
    }

    // Verify tasks exist
    const sourceTask = await db.task.findUnique({ where: { id: sourceTaskId }, include: { project: true } });
    const targetTask = await db.task.findUnique({ where: { id: targetTaskId } });

    if (!sourceTask || !targetTask) {
      return NextResponse.json({ error: "One or both tasks not found" }, { status: 404 });
    }

    // Verify membership
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: sourceTask.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const link = await db.taskLink.create({
      data: {
        sourceTaskId,
        targetTaskId,
        type,
      },
    });

    return NextResponse.json({ success: true, link });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove task link
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const linkId = url.searchParams.get("linkId");

    if (!linkId) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    const link = await db.taskLink.findUnique({
      where: { id: linkId },
      include: {
        sourceTask: {
          include: { project: true },
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Task link not found" }, { status: 404 });
    }

    // Verify membership
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: link.sourceTask.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.taskLink.delete({
      where: { id: linkId },
    });

    return NextResponse.json({ success: true, message: "Task link removed successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
