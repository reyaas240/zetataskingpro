import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Fetch members of an organization
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const organizationId = url.searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    // Verify membership
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await db.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            avatarUrl: true, 
            timezone: true,
            boardMembers: {
              where: {
                board: {
                  project: {
                    organizationId
                  }
                }
              }
            }
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Direct manual assignment of user by email
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email, organizationId, role } = body;

    if (!email || !organizationId) {
      return NextResponse.json({ error: "Email and Organization ID are required" }, { status: 400 });
    }

    // Verify Org Admin permission
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Only Organization Admins can assign members directly" }, { status: 403 });
    }

    // Check if target user exists in system and is verified
    const targetUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!targetUser) {
      return NextResponse.json({
        error: "No registered user found with this email. Please use Invitation flow instead.",
      }, { status: 404 });
    }

    if (!targetUser.isVerified) {
      return NextResponse.json({
        error: "User account exists but is not verified. Please invite them instead.",
      }, { status: 400 });
    }

    // Check if already a member
    const existingMember = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
    }

    // Direct add
    const newMember = await db.organizationMember.create({
      data: {
        organizationId,
        userId: targetUser.id,
        role: role || "MEMBER",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ success: true, member: newMember });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove member from organization
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const organizationId = url.searchParams.get("organizationId");
    const targetUserId = url.searchParams.get("userId");

    if (!organizationId || !targetUserId) {
      return NextResponse.json({ error: "organizationId and userId are required" }, { status: 400 });
    }

    // Verify Org Admin permission
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Only Organization Admins can remove members" }, { status: 403 });
    }

    // Check if target is the last admin
    if (targetUserId === user.id) {
      const adminCount = await db.organizationMember.count({
        where: { organizationId, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot remove the last administrator of the organization" }, { status: 400 });
      }
    }

    await db.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
    });

    return NextResponse.json({ success: true, message: "Member removed successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
