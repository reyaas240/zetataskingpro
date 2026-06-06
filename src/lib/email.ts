import nodemailer from "nodemailer";
import { db } from "./db";

export async function getTransporter() {
  const config = await db.systemConfig.findUnique({
    where: { id: "default-system-config" },
  });

  if (!config || !config.smtpHost) {
    return null;
  }

  // Create transporter if config is valid
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort || 587,
      secure: config.smtpPort === 465, // true for 465, false for other ports
      auth: config.smtpUser
        ? {
            user: config.smtpUser,
            pass: config.smtpPass || "",
          }
        : undefined,
      tls: {
        rejectUnauthorized: false, // Bypasses self-signed certificate and custom SSL chain validation issues
      },
    });
    return { transporter, from: config.smtpFrom || "no-reply@zetatasking.pro" };
  } catch (error) {
    console.error("Failed to construct nodemailer transporter:", error);
    return null;
  }
}

export async function sendOtpEmail(email: string, otp: string, purpose: string): Promise<{ success: boolean; loggedToConsole: boolean }> {
  console.log(`[DEVELOPER MODE - OTP DISPATCH] email=${email} otp=${otp} purpose=${purpose}`);
  
  const mailDetails = await getTransporter();
  if (!mailDetails) {
    console.log(`\n==================================================`);
    console.log(`📨 [OTP LOCAL FALLBACK]`);
    console.log(`To: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`==================================================\n`);
    return { success: true, loggedToConsole: true };
  }

  try {
    const { transporter, from } = mailDetails;
    await transporter.sendMail({
      from,
      to: email,
      subject: `[Zeta TaskingPro] OTP Code for ${purpose}`,
      text: `Your OTP code for ${purpose} is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Zeta TaskingPro</h2>
          <p>Please use the following One-Time Password (OTP) to complete your <strong>${purpose}</strong>:</p>
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 12px; background: #eff6ff; color: #2563eb; display: inline-block; border-radius: 6px; margin: 10px 0;">
            ${otp}
          </div>
          <p>This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
        </div>
      `,
    });
    return { success: true, loggedToConsole: false };
  } catch (error) {
    console.error("Nodemailer failed to send OTP email, falling back to console:", error);
    console.log(`\n==================================================`);
    console.log(`📨 [OTP LOCAL FALLBACK - SEND FAIL ERROR]`);
    console.log(`To: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`==================================================\n`);
    return { success: true, loggedToConsole: true };
  }
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  otpCode: string,
  orgName: string,
  baseUrl?: string
): Promise<{ success: boolean; loggedToConsole: boolean }> {
  const origin = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:6001";
  const inviteUrl = `${origin}/invite/${token}`;
  
  console.log(`[DEVELOPER MODE - INVITE DISPATCH] email=${email} orgName=${orgName} inviteUrl=${inviteUrl} otp=${otpCode}`);
  
  const mailDetails = await getTransporter();
  if (!mailDetails) {
    console.log(`\n==================================================`);
    console.log(`📨 [INVITE LOCAL FALLBACK]`);
    console.log(`To: ${email}`);
    console.log(`Organization: ${orgName}`);
    console.log(`Invite Link: ${inviteUrl}`);
    console.log(`Invite OTP Code: ${otpCode}`);
    console.log(`==================================================\n`);
    return { success: true, loggedToConsole: true };
  }

  try {
    const { transporter, from } = mailDetails;
    await transporter.sendMail({
      from,
      to: email,
      subject: `[Zeta TaskingPro] You are invited to join ${orgName}`,
      text: `You have been invited to join ${orgName} on Zeta TaskingPro. Click the link to accept: ${inviteUrl}. Your validation code is: ${otpCode}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
          <h2>Zeta TaskingPro</h2>
          <p>You have been invited to join <strong>${orgName}</strong> on Zeta TaskingPro.</p>
          <p>Click the link below to accept the invitation and set up your workspace:</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0;">
            Accept Invitation
          </a>
          <p>Use the following OTP validation code during registration to join automatically:</p>
          <div style="font-size: 20px; font-weight: bold; background: #eff6ff; color: #2563eb; padding: 8px 16px; display: inline-block; border-radius: 4px;">
            ${otpCode}
          </div>
        </div>
      `,
    });
    return { success: true, loggedToConsole: false };
  } catch (error) {
    console.error("Nodemailer failed to send invite email, falling back to console:", error);
    console.log(`\n==================================================`);
    console.log(`📨 [INVITE LOCAL FALLBACK - SEND FAIL ERROR]`);
    console.log(`To: ${email}`);
    console.log(`Organization: ${orgName}`);
    console.log(`Invite Link: ${inviteUrl}`);
    console.log(`Invite OTP Code: ${otpCode}`);
    console.log(`==================================================\n`);
    return { success: true, loggedToConsole: true };
  }
}
export async function sendTaskAssignmentEmail(
  email: string,
  task: { code: string; title: string; description?: string | null },
  baseUrl?: string
): Promise<{ success: boolean; loggedToConsole: boolean }> {
  const origin = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:6001";
  const appUrl = `${origin}/dashboard`;
  
  const mailDetails = await getTransporter();
  if (!mailDetails) {
    console.log(`\n==================================================`);
    console.log(`📨 [TASK ASSIGNMENT EMAIL FALLBACK]`);
    console.log(`To: ${email}`);
    console.log(`Task: ${task.code} - ${task.title}`);
    console.log(`==================================================\n`);
    return { success: true, loggedToConsole: true };
  }
  
  try {
    const { transporter, from } = mailDetails;
    console.log(`[DEBUG] Sending task assignment email to ${email}`);
    console.log(`[DEBUG] Transporter options:`, transporter.options || transporter);
    await transporter.sendMail({
      from,
      to: email,
      subject: `[Zeta TaskingPro] New Task Assigned: ${task.code}`,
      text: `You have been assigned a new task on Zeta TaskingPro.\n\nCode: ${task.code}\nTitle: ${task.title}\n\nLogin to view details: ${appUrl}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #111827; margin-top: 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">Zeta TaskingPro</h2>
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">Hello,</p>
            <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">You have been assigned a new task.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 0 0 8px 0; color: #374151; font-size: 15px;"><strong>Task Code:</strong> ${task.code}</p>
              <p style="margin: 0; color: #374151; font-size: 15px;"><strong>Title:</strong> ${task.title}</p>
            </div>
            
            <a href="${origin}/dashboard/tasks/${task.code}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px; font-size: 15px;">
              View Task
            </a>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              This is an automated notification from Zeta TaskingPro. Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `,
    });
    return { success: true, loggedToConsole: false };
  } catch (error) {
    console.error("Failed to send task assignment email, fallback to console", error);
    console.log(`\n==================================================`);
    console.log(`📨 [TASK ASSIGNMENT EMAIL FALLBACK - SEND FAIL ERROR]`);
    console.log(`To: ${email}`);
    console.log(`Task: ${task.code} - ${task.title}`);
    console.log(`==================================================\n`);
    return { success: true, loggedToConsole: true };
  }
}
