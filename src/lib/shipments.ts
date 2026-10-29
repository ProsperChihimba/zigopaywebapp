import "server-only";
import { sql } from "drizzle-orm";
import { schema } from "@/db";
import { qualified } from "@/db/sql";

const { cargo, shipments } = schema;
const shipmentId = qualified(shipments.id);

/** Per-shipment totals over its cargo, for use in a select on `shipments`. */
export const shipmentTotals = {
  cargoCount: sql<number>`(select count(*) from ${cargo} where ${cargo.shipmentId} = ${shipmentId})`.mapWith(Number),
  cbm: sql<number>`(select coalesce(sum(${cargo.volume}), 0) from ${cargo} where ${cargo.shipmentId} = ${shipmentId} and ${cargo.volumeUnit} = 'cbm')`.mapWith(Number),
  kg: sql<number>`(select coalesce(sum(${cargo.volume}), 0) from ${cargo} where ${cargo.shipmentId} = ${shipmentId} and ${cargo.volumeUnit} = 'kg')`.mapWith(Number),
  valueUsd: sql<number>`(select coalesce(sum(${cargo.valueUsd}), 0) from ${cargo} where ${cargo.shipmentId} = ${shipmentId})`.mapWith(Number),
};

export const totalVolume = (cbm: number, kg: number) => [cbm && `${+cbm.toFixed(3)} cbm`, kg && `${+kg.toFixed(2)} kg`].filter(Boolean).join(" + ") || "-";
