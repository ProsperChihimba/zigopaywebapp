CREATE TYPE "public"."account_status" AS ENUM('pending', 'created', 'failed');--> statement-breakpoint
CREATE TYPE "public"."cargo_status" AS ENUM('received', 'loaded', 'in_transit', 'arrived', 'delivered', 'collected');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('unpaid', 'partly_paid', 'paid');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('sms', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_source" AS ENUM('webhook', 'manual');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('registered', 'loaded', 'in_transit', 'at_port', 'arrived', 'off_loaded');--> statement-breakpoint
CREATE TYPE "public"."shipment_type" AS ENUM('sea', 'air');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'finance', 'warehouse');--> statement-breakpoint
CREATE TYPE "public"."volume_unit" AS ENUM('cbm', 'kg');--> statement-breakpoint
CREATE TABLE "cargo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"shipment_id" uuid,
	"tracking_no" varchar(40) NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"supplier" text,
	"supplier_tracking_no" text,
	"order_no" text,
	"packages" integer NOT NULL,
	"volume" numeric(12, 3) NOT NULL,
	"volume_unit" "volume_unit" NOT NULL,
	"cargo_type" text,
	"description" text,
	"value_usd" numeric(12, 2),
	"status" "cargo_status" DEFAULT 'received' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"status" "account_status" DEFAULT 'pending' NOT NULL,
	"bank_account_no" varchar(30),
	"account_name" text,
	"virtual_account_id" varchar(40),
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"address" text,
	"phone" text,
	"tin" text,
	"invoice_terms" text,
	"usd_rate" numeric(14, 2) DEFAULT '2700' NOT NULL,
	"daraja_partner_id" text,
	"sms_sender_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" varchar(20) NOT NULL,
	"destination_country" text DEFAULT 'Tanzania' NOT NULL,
	"wallet_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"cargo_id" uuid NOT NULL,
	"packages" integer NOT NULL,
	"volume" numeric(12, 3) NOT NULL,
	"volume_unit" "volume_unit" NOT NULL,
	"price_usd" numeric(12, 2) NOT NULL,
	"price_tzs" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_no" varchar(40) NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"usd_rate" numeric(14, 2) NOT NULL,
	"total_tzs" numeric(14, 2) NOT NULL,
	"amount_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "invoice_status" DEFAULT 'unpaid' NOT NULL,
	"pdf_token" varchar(32) NOT NULL,
	"pdf_url" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"channel" "message_channel" NOT NULL,
	"recipient" varchar(20) NOT NULL,
	"body" text,
	"invoice_id" uuid,
	"release_order_id" uuid,
	"status" "message_status" NOT NULL,
	"provider_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"invoice_id" uuid,
	"collection_id" varchar(40),
	"reference" text,
	"amount" numeric(14, 2) NOT NULL,
	"to_wallet" numeric(14, 2) DEFAULT '0' NOT NULL,
	"payer_name" text,
	"payer_account_no" text,
	"payer_bank" text,
	"received_at" timestamp with time zone NOT NULL,
	"source" "payment_source" NOT NULL,
	"note" text,
	"recorded_by" uuid,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"release_no" varchar(40) NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pdf_token" varchar(32) NOT NULL,
	"pdf_url" text,
	"collected_at" timestamp with time zone,
	"collected_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"shipment_no" varchar(40) NOT NULL,
	"name" text,
	"type" "shipment_type" NOT NULL,
	"status" "shipment_status" DEFAULT 'registered' NOT NULL,
	"etd" timestamp with time zone,
	"eta" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_accounts" ADD CONSTRAINT "collection_accounts_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_cargo_id_cargo_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_release_order_id_release_orders_id_fk" FOREIGN KEY ("release_order_id") REFERENCES "public"."release_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_orders" ADD CONSTRAINT "release_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_orders" ADD CONSTRAINT "release_orders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_orders" ADD CONSTRAINT "release_orders_collected_by_users_id_fk" FOREIGN KEY ("collected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cargo_company_tracking_idx" ON "cargo" USING btree ("company_id","tracking_no");--> statement-breakpoint
CREATE INDEX "cargo_customer_idx" ON "cargo" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "cargo_shipment_idx" ON "cargo" USING btree ("shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_accounts_invoice_idx" ON "collection_accounts" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "collection_accounts_bank_no_idx" ON "collection_accounts" USING btree ("bank_account_no");--> statement-breakpoint
CREATE INDEX "customers_company_idx" ON "customers" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_company_phone_idx" ON "customers" USING btree ("company_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_company_no_idx" ON "invoices" USING btree ("company_id","invoice_no");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_pdf_token_idx" ON "invoices" USING btree ("pdf_token");--> statement-breakpoint
CREATE INDEX "invoices_customer_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "messages_invoice_idx" ON "messages" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_collection_id_idx" ON "payments" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "release_orders_invoice_idx" ON "release_orders" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "release_orders_company_no_idx" ON "release_orders" USING btree ("company_id","release_no");--> statement-breakpoint
CREATE UNIQUE INDEX "release_orders_pdf_token_idx" ON "release_orders" USING btree ("pdf_token");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_company_no_idx" ON "shipments" USING btree ("company_id","shipment_no");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");