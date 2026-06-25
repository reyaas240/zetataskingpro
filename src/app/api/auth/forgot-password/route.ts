import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // For security, don't disclose whether the user exists or not.
      return NextResponse.json({
        success: true,
        message: "If that email is registered, we have sent a password reset link.",
      });
    }

    // Generate token and expiry (1 hour)
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user record with reset details
    await db.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    // Resolve dynamic request origin (production host or localhost)
    const url = new URL(req.url);
    const origin = url.origin;

    // Send reset email
    const emailResult = await sendPasswordResetEmail(user.email, token, origin);

    // In local development, if email goes to console fallback, we return the link for easier developer testing
    const showDevFallback = process.env.NODE_ENV !== "production" && emailResult.loggedToConsole;

    return NextResponse.json({
      success: true,
      message: "If that email is registered, we have sent a password reset link.",
      devResetUrl: showDevFallback ? `/reset-password?token=${token}` : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
