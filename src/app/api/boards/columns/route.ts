import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Fetch columns for a board
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

    const columns = await db.boardColumn.findMany({
      where: { boardId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ columns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new column
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, boardId } = body;

    if (!name || !boardId) {
      return NextResponse.json({ error: "Name and Board ID are required" }, { status: 400 });
    }

    // Verify board exists and get project/org
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: { project: true },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check membership
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: board.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Only Organization Admins can modify board structure" }, { status: 403 });
    }

    // Get max order
    const maxColumn = await db.boardColumn.findFirst({
      where: { boardId },
      orderBy: { order: "desc" },
    });
    const nextOrder = maxColumn ? maxColumn.order + 1 : 0;

    const column = await db.boardColumn.create({
      data: {
        name,
        order: nextOrder,
        boardId,
      },
    });

    return NextResponse.json({ success: true, column });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Reorder columns or Rename column
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { columns, columnId, name } = body;

    // Route 1: Batch reorder columns
    if (columns && Array.isArray(columns)) {
      // columns is array of { id, order }
      await db.$transaction(
        columns.map((col: any) =>
          db.boardColumn.update({
            where: { id: col.id },
            data: { order: col.order },
          })
        )
      );
      return NextResponse.json({ success: true, message: "Columns reordered successfully" });
    }

    // Route 2: Rename single column
    if (columnId && name) {
      const updatedColumn = await db.boardColumn.update({
        where: { id: columnId },
        data: { name },
      });
      return NextResponse.json({ success: true, column: updatedColumn });
    }

    return NextResponse.json({ error: "Invalid payload parameters" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove column
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const columnId = url.searchParams.get("columnId");

    if (!columnId) {
      return NextResponse.json({ error: "columnId is required" }, { status: 400 });
    }

    const column = await db.boardColumn.findUnique({
      where: { id: columnId },
      include: {
        board: {
          include: { project: true },
        },
      },
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // Check membership
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: column.board.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Only Organization Admins can modify board structure" }, { status: 403 });
    }

    // Check if column has tasks (onDelete: Restrict)
    const taskCount = await db.task.count({
      where: { columnId },
    });

    if (taskCount > 0) {
      return NextResponse.json({
        error: "Cannot delete column containing active tasks. Please move the tasks first.",
      }, { status: 400 });
    }

    await db.boardColumn.delete({
      where: { id: columnId },
    });

    return NextResponse.json({ success: true, message: "Column deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
