import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";

// GET: Validate invitation token
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const invitation = await db.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 404 });
    }

    if (invitation.isAccepted) {
      return NextResponse.json({ error: "Invitation already accepted" }, { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: "Invitation token has expired" }, { status: 400 });
    }

    // Check if user already exists
    const userExists = await db.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        organizationName: invitation.organization.name,
        organizationId: invitation.organizationId,
        boardId: invitation.boardId,
        role: invitation.role,
      },
      userExists: !!userExists,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Accept invitation / Register invited user
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, name, password, otp } = body;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const invitation = await db.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation || invitation.isAccepted || new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }

    const email = invitation.email.toLowerCase();

    // Check if user already exists
    let user = await db.user.findUnique({
      where: { email },
    });

    // If OTP is provided, verify it. Otherwise, send OTP.
    if (!otp) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      if (user) {
        // Update user's OTP
        user = await db.user.update({
          where: { id: user.id },
          data: { otpCode, otpExpiresAt },
        });
      } else {
        if (!name || !password) {
          return NextResponse.json({ error: "Name and password are required for new accounts" }, { status: 400 });
        }
        // Create unverified user
        user = await db.user.create({
          data: {
            email,
            name,
            passwordHash: hashPassword(password),
            otpCode,
            otpExpiresAt,
            isVerified: false,
          },
        });
      }

      // Send OTP
      const result = await sendOtpEmail(email, otpCode, `Join ${invitation.organization.name}`);

      return NextResponse.json({
        success: true,
        otpSent: true,
        email,
        otpLoggedToConsole: result.loggedToConsole,
        ...(process.env.NODE_ENV !== "production" && { devOtp: otpCode }),
      });
    }

    // OTP verification flow
    if (!user || user.otpCode !== otp || !user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return NextResponse.json({ error: "Invalid or expired OTP code" }, { status: 400 });
    }

    // Mark user as verified and clear OTP
    user = await db.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    // Add user to the organization
    await db.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
      update: {
        role: invitation.role,
      },
      create: {
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
      },
    });

    // Mark invitation as accepted
    await db.invitation.update({
      where: { id: invitation.id },
      data: { isAccepted: true },
    });

    // If invitation is for a specific board and user is ADMIN role, add to board admins
    if (invitation.boardId && invitation.role === "ADMIN") {
      await db.boardAdmin.upsert({
        where: {
          boardId_userId: {
            boardId: invitation.boardId,
            userId: user.id,
          },
        },
        update: {},
        create: {
          boardId: invitation.boardId,
          userId: user.id,
        },
      });
    }

    // Generate session token
    const sessionToken = generateToken({ userId: user.id, role: user.role });
    const response = NextResponse.json({
      success: true,
      message: `Joined ${invitation.organization.name} successfully!`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set("zeta_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
