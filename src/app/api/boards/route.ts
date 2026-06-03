import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Fetch boards for a project
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const boards = await db.board.findMany({
      where: { projectId },
      include: {
        columns: {
          orderBy: { order: "asc" },
        },
        admins: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ boards });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create board
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, projectId } = body;

    if (!name || !projectId) {
      return NextResponse.json({ error: "Name and Project ID are required" }, { status: 400 });
    }

    // Get project to find orgId
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify Org membership
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create board, columns, and board admin in a transaction
    const board = await db.$transaction(async (tx) => {
      // 1. Create Board
      const newBoard = await tx.board.create({
        data: {
          name,
          projectId,
        },
      });

      // 2. Create Default Columns
      const defaultColumns = ["To Do", "In Progress", "In Review", "Done"];
      await Promise.all(
        defaultColumns.map((colName, index) =>
          tx.boardColumn.create({
            data: {
              name: colName,
              order: index,
              boardId: newBoard.id,
            },
          })
        )
      );

      // 3. Create Board Admin
      await tx.boardAdmin.create({
        data: {
          boardId: newBoard.id,
          userId: user.id,
        },
      });

      return newBoard;
    });

    return NextResponse.json({ success: true, board });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update board name (Org Admins Only)
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { boardId, name } = body;

    if (!boardId || !name) {
      return NextResponse.json({ error: "Board ID and name are required" }, { status: 400 });
    }

    const board = await db.board.findUnique({
      where: { id: boardId },
      include: {
        project: true,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Verify Organization Admin status
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: board.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Organization Admins can edit board title" }, { status: 403 });
    }

    const updatedBoard = await db.board.update({
      where: { id: boardId },
      data: { name },
    });

    return NextResponse.json({ success: true, board: updatedBoard });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Drop board (Org Admins Only)
export async function DELETE(req: Request) {
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

    const board = await db.board.findUnique({
      where: { id: boardId },
      include: {
        project: true,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Verify Organization Admin status
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: board.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Organization Admins can delete boards" }, { status: 403 });
    }

    await db.board.delete({
      where: { id: boardId },
    });

    return NextResponse.json({ success: true, message: "Board deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

