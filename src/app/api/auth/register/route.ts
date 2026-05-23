import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing && existing.isVerified) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (existing && !existing.isVerified) {
      // Update existing unverified user
      await db.user.update({
        where: { id: existing.id },
        data: {
          name,
          passwordHash: hashPassword(password),
          otpCode,
          otpExpiresAt,
        },
      });
    } else {
      await db.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          passwordHash: hashPassword(password),
          otpCode,
          otpExpiresAt,
          isVerified: false,
        },
      });
    }

    // Send OTP via email or console fallback
    const result = await sendOtpEmail(email.toLowerCase(), otpCode, "Account Registration");

    return NextResponse.json({
      success: true,
      message: "OTP sent. Please verify your email.",
      email: email.toLowerCase(),
      otpLoggedToConsole: result.loggedToConsole,
      // In dev mode, include OTP for convenience
      ...(process.env.NODE_ENV !== "production" && { devOtp: otpCode }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
