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
export async function sendTaskAssignmentEmail(email: string, task: { code: string; title: string; description?: string }): Promise<{ success: boolean; loggedToConsole: boolean }> {
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
    await transporter.sendMail({
      from,
      to: email,
      subject: `[Zeta TaskingPro] New Task Assigned: ${task.code}`,
      text: `You have been assigned a new task:\n\nCode: ${task.code}\nTitle: ${task.title}\nDescription: ${task.description || ""}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>New Task Assigned</h2>
          <p>You have been assigned a new task:</p>
          <ul>
            <li><strong>Code:</strong> ${task.code}</li>
            <li><strong>Title:</strong> ${task.title}</li>
            ${task.description ? `<li><strong>Description:</strong> ${task.description}</li>` : ''}
          </ul>
        </div>
      `,
    });
    return { success: true, loggedToConsole: false };
  } catch (error) {
    console.error("Failed to send task assignment email, fallback to console", error);
    console.log(`\n==================================================`);
    console.log(`📨 [TASK ASSIGNMENT EMAIL FALLBACK - ERROR]`);
    console.log(`To: ${email}`);
    console.log(`Task: ${task.code} - ${task.title}`);
    console.log(`==================================================\n`);
    return { success: true, loggedToConsole: true };
  }
}
