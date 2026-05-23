import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Fetch projects for an organization
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

    // Verify membership
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

    const projects = await db.project.findMany({
      where: { organizationId },
      include: {
        boards: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create project
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, key, description, organizationId } = body;

    if (!name || !key || !organizationId) {
      return NextResponse.json({ error: "Name, Key, and Organization ID are required" }, { status: 400 });
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
      return NextResponse.json({ error: "Only Organization Admins can create projects" }, { status: 403 });
    }

    // Check project key uniqueness within organization
    const projectKeyUpper = key.toUpperCase();
    const existing = await db.project.findUnique({
      where: {
        organizationId_key: {
          organizationId,
          key: projectKeyUpper,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Project Key already exists in this organization" }, { status: 409 });
    }

    const project = await db.project.create({
      data: {
        name,
        key: projectKeyUpper,
        description,
        organizationId,
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
