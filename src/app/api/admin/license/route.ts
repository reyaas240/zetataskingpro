import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const licenses = await db.platformLicense.findMany({
    include: {
      plan: true,
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { startsAt: "desc" },
  });

  const plans = await db.licensePlan.findMany();

  return NextResponse.json({ licenses, plans });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { planId, durationDaysCustom } = body;

    const plan = await db.licensePlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "License plan not found" }, { status: 404 });
    }

    // Generate random 16 character license key: ZETA-XXXX-XXXX-XXXX
    const rand = crypto.randomBytes(6).toString("hex").toUpperCase();
    const licenseKey = `ZETA-${rand.slice(0, 4)}-${rand.slice(4, 8)}-${rand.slice(8, 12)}`;

    const days = durationDaysCustom ? parseInt(durationDaysCustom) : plan.durationDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const license = await db.platformLicense.create({
      data: {
        licenseKey,
        planId: plan.id,
        expiresAt,
        isActive: true,
      },
      include: {
        plan: true,
      },
    });

    return NextResponse.json({ success: true, license });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
