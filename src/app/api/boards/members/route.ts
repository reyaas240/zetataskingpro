import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST: Add a member to a board
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { boardId, userId } = body;

    if (!boardId || !userId) {
      return NextResponse.json({ error: "Board ID and User ID are required" }, { status: 400 });
    }

    const board = await db.board.findUnique({
      where: { id: boardId },
      include: { project: true },
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
      return NextResponse.json({ error: "Forbidden: Only Organization Admins can assign board members" }, { status: 403 });
    }

    // Check if target user is in the org
    const targetMembership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: board.project.organizationId,
          userId,
        },
      },
    });

    if (!targetMembership) {
      return NextResponse.json({ error: "Target user is not a member of this organization" }, { status: 400 });
    }

    const boardMember = await db.boardMember.upsert({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
      update: {},
      create: {
        boardId,
        userId,
      },
    });

    return NextResponse.json({ success: true, boardMember });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a member from a board
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const boardId = url.searchParams.get("boardId");
    const targetUserId = url.searchParams.get("userId");

    if (!boardId || !targetUserId) {
      return NextResponse.json({ error: "boardId and userId are required" }, { status: 400 });
    }

    const board = await db.board.findUnique({
      where: { id: boardId },
      include: { project: true },
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
      return NextResponse.json({ error: "Forbidden: Only Organization Admins can remove board members" }, { status: 403 });
    }

    await db.boardMember.deleteMany({
      where: {
        boardId,
        userId: targetUserId,
      },
    });

    return NextResponse.json({ success: true, message: "Board member removed successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
