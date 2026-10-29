import "./env";
import bcrypt from "bcryptjs";
import { db, schema } from "../src/db";

const { companies, users, customers, shipments, cargo } = schema;

const at = (iso: string) => new Date(`${iso}T18:21:00+03:00`);

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD");

  const existing = await db.query.companies.findFirst();
  if (existing) {
    console.log(`Already seeded (${existing.name}); nothing to do`);
    process.exit(0);
  }

  const [company] = await db
    .insert(companies)
    .values({
      name: "Demo Cargo Ltd",
      address: "Nyerere Road, Dar es Salaam, Tanzania",
      phone: "+255 700 000 000",
      usdRate: "2700",
      invoiceTerms: [
        "All payments must be made to the bank account shown on this invoice.",
        "Prices quoted are FOB ex-godown, Dar es Salaam.",
        "Goods must be collected within seven (7) days of the release order. Later collection may incur storage charges.",
      ].join("\n"),
    })
    .returning();

  await db.insert(users).values({
    companyId: company.id,
    name: "Demo Admin",
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10),
    role: "admin",
  });

  const people = await db
    .insert(customers)
    .values(
      [
        ["Chihimba Traders", "+255678232322"],
        ["TL Limited", "+255663728282"],
        ["Mgasa Spares", "+255744393939"],
        ["Ngarama Electronics", "+255749020020"],
        ["Polikwa Plastics", "+255783828389"],
        ["Jwead Fashion", "+255733349293"],
        ["Mabeo Stationers", "+255756362728"],
        ["East Africa JIN", "+255784884838"],
      ].map(([name, phone]) => ({ companyId: company.id, name, phone })),
    )
    .returning();

  const [sea, air] = await db
    .insert(shipments)
    .values([
      { companyId: company.id, shipmentNo: "SHW2343576", name: "Guangzhou sea, Aug", type: "sea", status: "in_transit", etd: at("2025-08-20"), eta: at("2025-10-20") },
      { companyId: company.id, shipmentNo: "SHA2343577", name: "Yiwu air, Aug", type: "air", status: "arrived", etd: at("2025-08-18"), eta: at("2025-08-25") },
    ])
    .returning();

  const rows: [string, number, string, number, string, "cbm" | "kg", string, string, string | null, typeof cargo.$inferInsert.status][] = [
    ["2025-08-15", 0, "78390220301", 2, "1", "cbm", "Clothes", "11.00", null, "received"],
    ["2025-07-15", 1, "678348939931", 6, "20", "kg", "Babyware table", "901.00", air.id, "arrived"],
    ["2025-06-15", 2, "346829220201", 5, "0.01", "cbm", "Spare parts", "2819.00", null, "received"],
    ["2025-05-15", 3, "902993939202", 4, "40", "kg", "TV stand", "761.00", air.id, "delivered"],
    ["2025-04-15", 4, "7638299233002", 52, "0.5", "cbm", "Plastic containers", "341.00", null, "received"],
    ["2025-03-15", 5, "ZTO93939727I3", 89, "90", "kg", "Clothes mtumba", "838.00", sea.id, "collected"],
    ["2025-02-15", 6, "YTF6328902023", 53, "0.05", "cbm", "School bags", "1212.00", sea.id, "in_transit"],
    ["2025-01-15", 7, "3748398302020", 1, "0.9", "cbm", "Shoes", "343.00", sea.id, "in_transit"],
  ];
  await db.insert(cargo).values(
    rows.map(([day, who, trackingNo, packages, volume, volumeUnit, description, valueUsd, shipmentId, status]) => ({
      companyId: company.id,
      customerId: people[who].id,
      shipmentId,
      trackingNo,
      receivedAt: at(day),
      packages,
      volume,
      volumeUnit,
      description,
      valueUsd,
      status,
    })),
  );

  console.log(`Seeded ${company.name}: 1 admin (${email}), ${people.length} customers, 2 shipments, ${rows.length} cargo`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
