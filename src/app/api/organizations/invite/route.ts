import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";
import crypto from "crypto";

// GET: Fetch active invitations for an organization
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

    const invitations = await db.invitation.findMany({
      where: {
        organizationId,
        isAccepted: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invitations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Send/Create an invitation
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email, organizationId, boardId, role } = body;

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
      return NextResponse.json({ error: "Only Organization Admins can invite members" }, { status: 403 });
    }

    const org = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if user is already a member of the organization
    const emailLower = email.toLowerCase();
    const existingUser = await db.user.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      const existingMember = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
      }
    }

    // Generate token and OTP
    const token = crypto.randomBytes(32).toString("hex");
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const invitation = await db.invitation.create({
      data: {
        email: emailLower,
        organizationId,
        boardId: boardId || null,
        invitedById: user.id,
        role: role || "MEMBER",
        token,
        otpCode,
        expiresAt,
      },
    });

    // Send email with invitation link
    const mailResult = await sendInvitationEmail(
      emailLower,
      token,
      otpCode,
      org.name
    );

    return NextResponse.json({
      success: true,
      invitation,
      otpLoggedToConsole: mailResult.loggedToConsole,
      ...(process.env.NODE_ENV !== "production" && { devOtp: otpCode }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
