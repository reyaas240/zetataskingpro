import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await db.systemConfig.findUnique({
    where: { id: "default-system-config" },
  });

  return NextResponse.json({
    smtpHost: config?.smtpHost || "",
    smtpPort: config?.smtpPort || 587,
    smtpUser: config?.smtpUser || "",
    smtpFrom: config?.smtpFrom || "no-reply@zetatasking.pro",
    platformName: config?.platformName || "Zeta TaskingPro",
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, platformName } = body;

    const data: any = {
      smtpHost,
      smtpPort: parseInt(smtpPort) || 587,
      smtpUser,
      smtpFrom,
      platformName: platformName || "Zeta TaskingPro",
    };

    if (smtpPass) {
      data.smtpPass = smtpPass;
    }

    const updated = await db.systemConfig.upsert({
      where: { id: "default-system-config" },
      update: data,
      create: {
        id: "default-system-config",
        ...data,
      },
    });

    return NextResponse.json({ success: true, config: {
      smtpHost: updated.smtpHost,
      smtpPort: updated.smtpPort,
      smtpUser: updated.smtpUser,
      smtpFrom: updated.smtpFrom,
      platformName: updated.platformName,
    }});
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
