/**
 * Seeds test property fees for vendor.oasis so the payment flow can be tested.
 * Run: node scripts/seed-fees.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Use ts-node / prisma client
const { PrismaClient } = require("../apps/api/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Find vendor.oasis
  const vendor = await prisma.user.findUnique({
    where: { email: "vendor.oasis@rentpropertyuae.com" },
    select: { id: true, fullName: true },
  });
  if (!vendor) {
    console.error("vendor.oasis not found — run demo seed first");
    process.exit(1);
  }
  console.log("Found vendor:", vendor.fullName, vendor.id);

  // Find their properties
  const properties = await prisma.property.findMany({
    where: { vendorId: vendor.id },
    select: { id: true, title: true },
    take: 3,
  });
  console.log(`Found ${properties.length} properties`);

  // Remove existing UNPAID test fees
  const deleted = await prisma.propertyFee.deleteMany({
    where: { vendorId: vendor.id, status: "UNPAID" },
  });
  console.log(`Deleted ${deleted.count} existing UNPAID fees`);

  if (properties.length === 0) {
    console.error("No properties found for vendor.oasis");
    process.exit(1);
  }

  // Add UNPAID fees: ACTIVATION (AED 2,100.00 = 210000), INSURANCE (AED 3,000.00 = 300000), FURNISHING (AED 5,150.00 = 515000)
  const feeSpecs = [
    { type: "ACTIVATION", amountMinor: 210000 },
    { type: "INSURANCE",  amountMinor: 300000 },
    { type: "FURNISHING", amountMinor: 515000 },
  ];

  const prop = properties[0];
  for (const spec of feeSpecs) {
    const fee = await prisma.propertyFee.create({
      data: {
        propertyId: prop.id,
        vendorId: vendor.id,
        type: spec.type,
        amountMinor: spec.amountMinor,
        currency: "AED",
        status: "UNPAID",
      },
    });
    console.log(`Created ${spec.type} fee: ${fee.id} (AED ${(spec.amountMinor / 100).toFixed(2)})`);
  }

  console.log("\nDone. vendor.oasis now has UNPAID fees for:", prop.title, `(${prop.id})`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
