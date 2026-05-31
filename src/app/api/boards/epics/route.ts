import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Fetch epics for a board
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

    const epics = await db.epic.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ epics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create epic
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, colorCode, description, boardId } = body;

    if (!name || !colorCode || !boardId) {
      return NextResponse.json({ error: "Name, Color, and Board ID are required" }, { status: 400 });
    }

    // Verify membership
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

    const epic = await db.epic.create({
      data: {
        name,
        colorCode,
        description,
        boardId,
      },
    });

    return NextResponse.json({ success: true, epic });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update epic
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { epicId, name, colorCode, description } = body;
    if (!epicId) {
      return NextResponse.json({ error: "epicId is required" }, { status: 400 });
    }

    // Verify epic exists and fetch board for membership check
    const epic = await db.epic.findUnique({
      where: { id: epicId },
      include: { board: { include: { project: true } } },
    });
    if (!epic) {
      return NextResponse.json({ error: "Epic not found" }, { status: 404 });
    }

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: epic.board.project.organizationId,
          userId: user.id,
        },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.epic.update({
      where: { id: epicId },
      data: {
        name: name ?? epic.name,
        colorCode: colorCode ?? epic.colorCode,
        description: description ?? epic.description,
      },
    });
    return NextResponse.json({ success: true, epic: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete epic
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const epicId = url.searchParams.get("epicId");

    if (!epicId) {
      return NextResponse.json({ error: "epicId is required" }, { status: 400 });
    }

    const epic = await db.epic.findUnique({
      where: { id: epicId },
      include: {
        board: {
          include: { project: true },
        },
      },
    });

    if (!epic) {
      return NextResponse.json({ error: "Epic not found" }, { status: 404 });
    }

    // Verify membership
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: epic.board.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete epic. The tasks referencing this epic will have their epicId set to null automatically due to `setNull` relation.
    await db.epic.delete({
      where: { id: epicId },
    });

    return NextResponse.json({ success: true, message: "Epic deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
