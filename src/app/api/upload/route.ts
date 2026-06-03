import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { put } from "@vercel/blob";
import path from "path";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.formData();
    const file = data.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;

    // Convert to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Vercel Blob (public)
    const blob = await put(`uploads/${uniqueFilename}`, buffer, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
