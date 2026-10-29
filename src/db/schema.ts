import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// Money is stored as exact decimals. TZS amounts use 2 decimal places.
const tzs = (name: string) => numeric(name, { precision: 14, scale: 2 });
const usd = (name: string) => numeric(name, { precision: 12, scale: 2 });
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const userRole = pgEnum("user_role", ["admin", "finance", "warehouse"]);
export const volumeUnit = pgEnum("volume_unit", ["cbm", "kg"]);
export const cargoStatus = pgEnum("cargo_status", ["received", "loaded", "in_transit", "arrived", "delivered", "collected"]);
export const shipmentType = pgEnum("shipment_type", ["sea", "air"]);
export const shipmentStatus = pgEnum("shipment_status", ["registered", "loaded", "in_transit", "at_port", "arrived", "off_loaded"]);
export const invoiceStatus = pgEnum("invoice_status", ["unpaid", "partly_paid", "paid"]);
// "uncertain": Daraja answered 502 or timed out, so the account may exist. Daraja ops must check; never retry automatically.
export const accountStatus = pgEnum("account_status", ["pending", "created", "failed", "uncertain"]);
export const paymentSource = pgEnum("payment_source", ["webhook", "manual"]);
export const messageChannel = pgEnum("message_channel", ["sms", "whatsapp"]);
export const messageStatus = pgEnum("message_status", ["sent", "failed"]);

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  address: text("address"),
  phone: text("phone"),
  tin: text("tin"),
  invoiceTerms: text("invoice_terms"),
  usdRate: tzs("usd_rate").notNull().default("2700"),
  darajaPartnerId: text("daraja_partner_id"),
  smsSenderId: text("sms_sender_id"),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    name: text("name").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("admin"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    name: text("name").notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    destinationCountry: text("destination_country").notNull().default("Tanzania"),
    walletBalance: tzs("wallet_balance").notNull().default("0"),
    createdAt: createdAt(),
  },
  (t) => [index("customers_company_idx").on(t.companyId), uniqueIndex("customers_company_phone_idx").on(t.companyId, t.phone)],
);

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    shipmentNo: varchar("shipment_no", { length: 40 }).notNull(),
    name: text("name"),
    type: shipmentType("type").notNull(),
    status: shipmentStatus("status").notNull().default("registered"),
    etd: timestamp("etd", { withTimezone: true }),
    eta: timestamp("eta", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("shipments_company_no_idx").on(t.companyId, t.shipmentNo)],
);

export const cargo = pgTable(
  "cargo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    shipmentId: uuid("shipment_id").references(() => shipments.id),
    trackingNo: varchar("tracking_no", { length: 40 }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    supplier: text("supplier"),
    supplierTrackingNo: text("supplier_tracking_no"),
    orderNo: text("order_no"),
    packages: integer("packages").notNull(),
    volume: numeric("volume", { precision: 12, scale: 3 }).notNull(),
    volumeUnit: volumeUnit("volume_unit").notNull(),
    cargoType: text("cargo_type"),
    description: text("description"),
    valueUsd: usd("value_usd"),
    status: cargoStatus("status").notNull().default("received"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("cargo_company_tracking_idx").on(t.companyId, t.trackingNo),
    index("cargo_customer_idx").on(t.customerId),
    index("cargo_shipment_idx").on(t.shipmentId),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    invoiceNo: varchar("invoice_no", { length: 40 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    usdRate: tzs("usd_rate").notNull(),
    totalTzs: tzs("total_tzs").notNull(),
    amountPaid: tzs("amount_paid").notNull().default("0"),
    status: invoiceStatus("status").notNull().default("unpaid"),
    pdfToken: varchar("pdf_token", { length: 32 }).notNull(),
    pdfUrl: text("pdf_url"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("invoices_company_no_idx").on(t.companyId, t.invoiceNo),
    uniqueIndex("invoices_pdf_token_idx").on(t.pdfToken),
    index("invoices_customer_idx").on(t.customerId),
  ],
);

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  cargoId: uuid("cargo_id").notNull().references(() => cargo.id),
  packages: integer("packages").notNull(),
  volume: numeric("volume", { precision: 12, scale: 3 }).notNull(),
  volumeUnit: volumeUnit("volume_unit").notNull(),
  priceUsd: usd("price_usd").notNull(),
  priceTzs: tzs("price_tzs").notNull(),
});

export const collectionAccounts = pgTable(
  "collection_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
    status: accountStatus("status").notNull().default("pending"),
    bankAccountNo: varchar("bank_account_no", { length: 30 }),
    accountName: text("account_name"),
    virtualAccountId: varchar("virtual_account_id", { length: 40 }),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("collection_accounts_invoice_idx").on(t.invoiceId), index("collection_accounts_bank_no_idx").on(t.bankAccountNo)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    // Daraja's collection_id: a webhook delivered twice can never be counted twice.
    collectionId: varchar("collection_id", { length: 40 }),
    reference: text("reference"),
    amount: tzs("amount").notNull(),
    toWallet: tzs("to_wallet").notNull().default("0"),
    payerName: text("payer_name"),
    payerAccountNo: text("payer_account_no"),
    payerBank: text("payer_bank"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    source: paymentSource("source").notNull(),
    note: text("note"),
    recordedBy: uuid("recorded_by").references(() => users.id),
    raw: jsonb("raw"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("payments_collection_id_idx").on(t.collectionId), index("payments_invoice_idx").on(t.invoiceId)],
);

export const releaseOrders = pgTable(
  "release_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
    releaseNo: varchar("release_no", { length: 40 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
    pdfToken: varchar("pdf_token", { length: 32 }).notNull(),
    pdfUrl: text("pdf_url"),
    collectedAt: timestamp("collected_at", { withTimezone: true }),
    collectedBy: uuid("collected_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("release_orders_invoice_idx").on(t.invoiceId),
    uniqueIndex("release_orders_company_no_idx").on(t.companyId, t.releaseNo),
    uniqueIndex("release_orders_pdf_token_idx").on(t.pdfToken),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    channel: messageChannel("channel").notNull(),
    recipient: varchar("recipient", { length: 20 }).notNull(),
    body: text("body"),
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    releaseOrderId: uuid("release_order_id").references(() => releaseOrders.id),
    status: messageStatus("status").notNull(),
    providerResponse: jsonb("provider_response"),
    createdAt: createdAt(),
  },
  (t) => [index("messages_invoice_idx").on(t.invoiceId)],
);
