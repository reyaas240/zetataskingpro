import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, comparePassword } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT: Update Profile (Name, Timezone, Avatar)
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, timezone, avatarUrl } = body;

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        ...(name && { name }),
        ...(timezone && { timezone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        timezone: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Change Password
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required" }, { status: 400 });
    }

    // Get user with password hash
    const fullUser = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = comparePassword(currentPassword, fullUser.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password does not match" }, { status: 400 });
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(newPassword),
      },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
