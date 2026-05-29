import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, testRecipient } = body;

    if (!smtpHost || !smtpFrom || !testRecipient) {
      return NextResponse.json({ error: "SMTP Host, Sender Email, and Test Recipient are required." }, { status: 400 });
    }

    // Load stored password if not provided in request (since UI hides it on load)
    let finalPass = smtpPass;
    if (!finalPass) {
      const storedConfig = await db.systemConfig.findUnique({
        where: { id: "default-system-config" },
      });
      finalPass = storedConfig?.smtpPass || "";
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort) || 587,
      secure: parseInt(smtpPort) === 465,
      auth: smtpUser
        ? {
            user: smtpUser,
            pass: finalPass,
          }
        : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });

    // 1. Verify Connection
    try {
      await transporter.verify();
    } catch (verifyError: any) {
      return NextResponse.json({
        success: false,
        stage: "CONNECTION_VERIFY",
        error: verifyError.message || "Failed to establish connection with SMTP server.",
      });
    }

    // 2. Send Test Email
    try {
      await transporter.sendMail({
        from: smtpFrom,
        to: testRecipient,
        subject: "[Zeta TaskingPro] Test Email Delivery",
        text: `This is a test email sent from Zeta TaskingPro to verify your SMTP settings. Congratulations, it works!`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <h2>Zeta TaskingPro SMTP Test</h2>
            <p>This is a test email sent to verify your outgoing SMTP mailer configuration.</p>
            <p style="color: #2563eb; font-weight: bold;">✓ Email delivery successful!</p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `,
      });
    } catch (sendError: any) {
      return NextResponse.json({
        success: false,
        stage: "EMAIL_SEND",
        error: sendError.message || "Connection succeeded, but email sending failed.",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
