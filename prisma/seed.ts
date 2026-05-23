import { PrismaClient, SystemRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Create or update Default SystemConfig
  const systemConfig = await prisma.systemConfig.upsert({
    where: { id: "default-system-config" },
    update: {},
    create: {
      id: "default-system-config",
      platformName: "Zeta TaskingPro",
      smtpHost: "localhost",
      smtpPort: 1025,
      smtpUser: "",
      smtpPass: "",
      smtpFrom: "no-reply@zetatasking.pro",
    },
  });
  console.log("Seeded SystemConfig:", systemConfig.platformName);

  // 2. Create Default License Plans
  const plans = [
    {
      id: "plan-free",
      name: "Free Plan",
      price: 0.0,
      maxUsers: 5,
      maxOrgs: 1,
      durationDays: 365,
      description: "For small teams starting their agile journey. Max 5 users.",
    },
    {
      id: "plan-team",
      name: "Team Plan",
      price: 49.0,
      maxUsers: 25,
      maxOrgs: 2,
      durationDays: 30,
      description: "For growing teams that need sprint planning. Max 25 users.",
    },
    {
      id: "plan-enterprise",
      name: "Enterprise Plan",
      price: 199.0,
      maxUsers: 9999,
      maxOrgs: 99,
      durationDays: 30,
      description: "For enterprise scale organizations with custom support and SLA. Unlimited users.",
    },
  ];

  for (const plan of plans) {
    await prisma.licensePlan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }
  console.log("Seeded License Plans");

  // 3. Create Default Platform Admin
  const adminEmail = "admin@zetatasking.pro";
  const passwordHash = bcrypt.hashSync("admin123", 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Platform Administrator",
      passwordHash: passwordHash,
      role: SystemRole.PLATFORM_ADMIN,
      isVerified: true,
      timezone: "UTC",
    },
  });
  console.log("Seeded Platform Admin:", adminUser.email);

  // 4. Create Global Default Priorities
  const priorities = [
    { id: "priority-critical", name: "Critical", color: "#ef4444", level: 1 },
    { id: "priority-high", name: "High", color: "#f97316", level: 2 },
    { id: "priority-medium", name: "Medium", color: "#eab308", level: 3 },
    { id: "priority-low", name: "Low", color: "#3b82f6", level: 4 },
  ];

  for (const prio of priorities) {
    await prisma.priority.upsert({
      where: { id: prio.id },
      update: prio,
      create: prio,
    });
  }
  console.log("Seeded default priorities");

  console.log("Seeding complete successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
