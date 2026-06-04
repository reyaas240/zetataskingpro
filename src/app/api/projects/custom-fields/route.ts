import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Fetch all custom fields for a project
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

    const customFields = await db.customField.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ customFields });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a custom field for a project
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { projectId, name, type, options } = body;

    if (!projectId || !name || !type) {
      return NextResponse.json({ error: "projectId, name, and type are required" }, { status: 400 });
    }

    // Verify the user is an org admin or board admin for this project
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId: user.id,
        },
      },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const customField = await db.customField.create({
      data: {
        projectId,
        name,
        type,
        options: options ? JSON.stringify(options) : null,
      },
    });

    return NextResponse.json({ success: true, customField });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a custom field
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const customFieldId = url.searchParams.get("customFieldId");
    if (!customFieldId) return NextResponse.json({ error: "customFieldId is required" }, { status: 400 });

    const field = await db.customField.findUnique({
      where: { id: customFieldId },
      include: { project: true },
    });
    if (!field) return NextResponse.json({ error: "Field not found" }, { status: 404 });

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: field.project.organizationId,
          userId: user.id,
        },
      },
    });
    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.customField.delete({ where: { id: customFieldId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
