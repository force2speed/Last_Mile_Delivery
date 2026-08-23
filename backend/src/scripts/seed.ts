// =============================================================================
// src/scripts/seed.ts — Seed essential data for local development
// Run: npx ts-node src/scripts/seed.ts
// =============================================================================
import "dotenv/config";
import { PrismaClient, Role, BusinessType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── 1. Zones ───────────────────────────────────────────────────────────────
  const zones = await Promise.all([
    prisma.zone.upsert({ where: { code: "NDL" }, update: {}, create: { name: "North Delhi", code: "NDL" } }),
    prisma.zone.upsert({ where: { code: "SDL" }, update: {}, create: { name: "South Delhi", code: "SDL" } }),
    prisma.zone.upsert({ where: { code: "MUM" }, update: {}, create: { name: "Mumbai Central", code: "MUM" } }),
  ]);
  console.log(`✅  ${zones.length} zones created`);

  // ── 2. Areas (pincodes) ────────────────────────────────────────────────────
  const areas = await Promise.all([
    prisma.area.upsert({ where: { pincode: "110001" }, update: {}, create: { name: "Connaught Place", pincode: "110001", zoneId: zones[0].id } }),
    prisma.area.upsert({ where: { pincode: "110006" }, update: {}, create: { name: "Karol Bagh",      pincode: "110006", zoneId: zones[0].id } }),
    prisma.area.upsert({ where: { pincode: "110030" }, update: {}, create: { name: "Hauz Khas",       pincode: "110030", zoneId: zones[1].id } }),
    prisma.area.upsert({ where: { pincode: "110049" }, update: {}, create: { name: "Saket",           pincode: "110049", zoneId: zones[1].id } }),
    prisma.area.upsert({ where: { pincode: "400001" }, update: {}, create: { name: "Fort",            pincode: "400001", zoneId: zones[2].id } }),
  ]);
  console.log(`✅  ${areas.length} areas created`);

  // ── 3. Users ───────────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@lastmile.dev" },
    update: {},
    create: { email: "admin@lastmile.dev", passwordHash: await hash("Admin@123"), fullName: "Super Admin", phone: "+911111111111", role: Role.ADMIN },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@lastmile.dev" },
    update: {},
    create: { email: "customer@lastmile.dev", passwordHash: await hash("Customer@123"), fullName: "Priya Sharma", phone: "+912222222222", role: Role.CUSTOMER },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: "agent@lastmile.dev" },
    update: {},
    create: { email: "agent@lastmile.dev", passwordHash: await hash("Agent@123"), fullName: "Ravi Kumar", phone: "+913333333333", role: Role.DELIVERY_AGENT },
  });

  // Agent profile
  await prisma.agentProfile.upsert({
    where: { userId: agentUser.id },
    update: {},
    create: {
      userId: agentUser.id, status: "AVAILABLE",
      currentLatitude: 28.6315, currentLongitude: 77.2167,
      lastLocationAt: new Date(),
      currentZoneId: zones[0].id, homeZoneId: zones[0].id,
      vehicleType: "Bike", vehicleNumber: "DL01AB1234",
    },
  });
  console.log("✅  3 users + 1 agent profile created");

  // ── 4. Rate Cards ─────────────────────────────────────────────────────────
  await prisma.rateCard.upsert({
    where: { id: "seed-b2c-v1" },
    update: {},
    create: {
      id: "seed-b2c-v1",
      name: "B2C Standard v1", version: 1, businessType: BusinessType.B2C,
      baseRateIntraZone: 50, perKgRateIntraZone: 15,
      baseRateInterZone: 80, perKgRateInterZone: 18,
      codSurchargeFlat: 20, codSurchargePercent: 1.5,
      isActive: true, createdById: admin.id,
    },
  });

  await prisma.rateCard.upsert({
    where: { id: "seed-b2b-v1" },
    update: {},
    create: {
      id: "seed-b2b-v1",
      name: "B2B Enterprise v1", version: 1, businessType: BusinessType.B2B,
      baseRateIntraZone: 40, perKgRateIntraZone: 12,
      baseRateInterZone: 65, perKgRateInterZone: 14,
      codSurchargeFlat: 30, codSurchargePercent: 1.0,
      isActive: true, createdById: admin.id,
    },
  });
  console.log("✅  2 rate cards created (B2C + B2B)");

  console.log("\n🎉  Seed complete!");
  console.log("──────────────────────────────");
  console.log("Admin    → admin@lastmile.dev    / Admin@123");
  console.log("Customer → customer@lastmile.dev / Customer@123");
  console.log("Agent    → agent@lastmile.dev    / Agent@123");
}

main()
  .catch((e) => { console.error("❌  Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
