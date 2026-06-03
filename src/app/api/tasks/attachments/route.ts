// src/app/api/tasks/attachments/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { put } from "@vercel/blob";
import path from "path";

// POST: Upload an attachment for a task
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.formData();
    const file = data.get("file") as File | null;
    const taskId = data.get("taskId") as string | null;

    if (!file || !taskId) {
      return NextResponse.json({ error: "File and Task ID are required" }, { status: 400 });
    }

    // Verify task exists and membership
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: task.project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Process file upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename for blob storage
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}${fileExtension}`;

    // Upload to Vercel Blob (correct 3‑argument signature)
    const blob = await put(`uploads/${uniqueFilename}`, buffer, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    // The Blob library returns a public URL we can store
    const fileUrl = blob.url;

    // Register attachment in database
    const attachment = await db.attachment.create({
      data: {
        fileName: file.name,
        fileUrl: fileUrl,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        taskId,
      },
    });

    return NextResponse.json({ success: true, attachment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
