import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Fetch sprints for a board
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const boardId = url.searchParams.get("boardId");

    if (!boardId) {
      return NextResponse.json({ error: "boardId is required" }, { status: 400 });
    }

    const sprints = await db.sprint.findMany({
      where: { boardId },
      include: {
        tasks: {
          select: { id: true, title: true, priority: true, taskType: true, storyPoints: true, columnId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sprints });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create sprint
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, boardId, startDate, endDate } = body;

    if (!name || !boardId) {
      return NextResponse.json({ error: "Name and Board ID are required" }, { status: 400 });
    }

    const board = await db.board.findUnique({
      where: { id: boardId },
      include: { project: true },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: board.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sprint = await db.sprint.create({
      data: {
        name,
        boardId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: "PLANNING",
      },
    });

    return NextResponse.json({ success: true, sprint });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update sprint (Start / Complete / Edit)
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sprintId, name, startDate, endDate, status, moveUncompletedTo } = body;

    if (!sprintId) {
      return NextResponse.json({ error: "sprintId is required" }, { status: 400 });
    }

    const sprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: {
        board: {
          include: {
            project: true,
            columns: { orderBy: { order: "asc" } },
          },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Verify membership
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: sprint.board.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // SPRINT COMPLETION LOGIC
    if (status === "COMPLETED" && sprint.status !== "COMPLETED") {
      // Find the final "Done" column (the column with the largest order index)
      const doneColumn = sprint.board.columns[sprint.board.columns.length - 1];
      
      if (doneColumn) {
        // Find all incomplete tasks in the current sprint
        const incompleteTasks = await db.task.findMany({
          where: {
            sprintId,
            columnId: { not: doneColumn.id },
          },
        });

        if (incompleteTasks.length > 0) {
          // If a target sprint is specified, move tasks there. Otherwise move back to Backlog (null)
          const targetSprintId = moveUncompletedTo || null;
          await db.task.updateMany({
            where: {
              id: { in: incompleteTasks.map((t) => t.id) },
            },
            data: {
              sprintId: targetSprintId,
            },
          });
        }
      }
    }

    // Perform regular update
    const updatedSprint = await db.sprint.update({
      where: { id: sprintId },
      data: {
        ...(name && { name }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ success: true, sprint: updatedSprint });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a sprint
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const sprintId = url.searchParams.get("sprintId");

    if (!sprintId) {
      return NextResponse.json({ error: "sprintId is required" }, { status: 400 });
    }

    const sprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: {
        board: {
          include: {
            project: true,
          },
        },
        tasks: {
          select: { id: true },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Verify membership and admin role
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: sprint.board.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Only organization admins can delete sprints." }, { status: 403 });
    }

    // Verify no tasks are in the sprint
    if (sprint.tasks.length > 0) {
      return NextResponse.json({
        error: "Cannot delete sprint. The sprint must be empty (no tasks) to be deleted.",
      }, { status: 400 });
    }

    await db.sprint.delete({
      where: { id: sprintId },
    });

    return NextResponse.json({ success: true, message: "Sprint deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
