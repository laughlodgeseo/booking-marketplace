import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("../apps/api/node_modules/@prisma/client");
const prisma = new PrismaClient();

const vendor = await prisma.user.findUnique({
  where: { email: "vendor.oasis@rentpropertyuae.com" },
  select: { id: true },
});
if (!vendor) { console.error("vendor.oasis not found"); process.exit(1); }

await prisma.vendorPayoutMethod.deleteMany({ where: { vendorId: vendor.id } });

await prisma.vendorPayoutMethod.create({
  data: {
    vendorId: vendor.id,
    type: "UAE_BANK_TRANSFER",
    status: "PENDING_REVIEW",
    accountHolderName: "Oasis Keys LLC",
    bankName: "Emirates NBD",
    iban: "AE370330000010230695003",
    accountNumberLast4: "5003",
    accountNumberEnc: "enc_1023069500301",
    swiftCode: "EBILAEAD",
    bankCountry: "AE",
    bankCity: "Dubai",
    currency: "AED",
    isDefault: true,
  },
});
console.log("Created PENDING_REVIEW payout method for vendor.oasis");
await prisma.$disconnect();
