import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Fetch user's organizations
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            projects: {
              include: {
                boards: {
                  include: {
                    members: true,
                  }
                },
              },
            },
            license: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    const organizations = memberships.map((m) => {
      // If user is ADMIN, they see all boards. Otherwise, filter by their boardMembers.
      const isOrgAdmin = m.role === "ADMIN";

      const filteredProjects = m.organization.projects.map(proj => {
        return {
          ...proj,
          boards: isOrgAdmin 
            ? proj.boards 
            : proj.boards.filter(b => b.members.some(member => member.userId === user.id))
        };
      });

      return {
        id: m.organization.id,
        name: m.organization.name,
        timezone: m.organization.timezone,
        role: m.role,
        projects: filteredProjects,
        license: m.organization.license,
      };
    });

    return NextResponse.json({ organizations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create organization by redeeming a license key
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, timezone, licenseKey } = body;

    if (!name || !licenseKey) {
      return NextResponse.json({ error: "Organization Name and License Key are required" }, { status: 400 });
    }

    // Validate license key
    const license = await db.platformLicense.findUnique({
      where: { licenseKey },
      include: { plan: true },
    });

    if (!license) {
      return NextResponse.json({ error: "Invalid License Key" }, { status: 404 });
    }

    if (license.organizationId) {
      return NextResponse.json({ error: "This License Key has already been redeemed" }, { status: 400 });
    }

    if (!license.isActive || new Date() > license.expiresAt) {
      return NextResponse.json({ error: "This License Key has expired or is inactive" }, { status: 400 });
    }

    // Create organization, assign membership, and link license in a transaction
    const org = await db.$transaction(async (tx) => {
      // 1. Create organization
      const newOrg = await tx.organization.create({
        data: {
          name,
          timezone: timezone || "UTC",
        },
      });

      // 2. Link license to organization
      await tx.platformLicense.update({
        where: { id: license.id },
        data: {
          organizationId: newOrg.id,
        },
      });

      // 3. Create ADMIN member
      await tx.organizationMember.create({
        data: {
          organizationId: newOrg.id,
          userId: user.id,
          role: "ADMIN",
        },
      });

      return newOrg;
    });

    return NextResponse.json({
      success: true,
      organization: org,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
