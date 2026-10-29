import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { Badge } from "@/components/badge";
import { Table } from "@/components/table";
import { AutoRefresh } from "@/components/auto-refresh";
import { formatDateTime, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { ACCOUNT_STATUS, INVOICE_STATUS } from "@/lib/invoice-labels";
import { resendAction, retryAccountAction } from "../actions";
import { resendReleaseOrderAction } from "../../payments/actions";
import { ManualPayment } from "./manual-payment";

export const metadata = { title: "Invoice · Zigopay" };

const { invoices, invoiceItems, cargo, customers, collectionAccounts, messages, payments, releaseOrders, users } = schema;

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [head] = await db
    .select({ invoice: invoices, customer: customers, account: collectionAccounts })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .leftJoin(collectionAccounts, eq(collectionAccounts.invoiceId, invoices.id))
    .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)));
  if (!head) notFound();
  const { invoice, customer, account } = head;

  const [items, sent, received, [releaseOrder]] = await Promise.all([
    db
      .select({ item: invoiceItems, trackingNo: cargo.trackingNo, description: cargo.description })
      .from(invoiceItems)
      .innerJoin(cargo, eq(cargo.id, invoiceItems.cargoId))
      .where(eq(invoiceItems.invoiceId, invoice.id))
      .orderBy(asc(cargo.receivedAt)),
    db.select().from(messages).where(eq(messages.invoiceId, invoice.id)).orderBy(desc(messages.createdAt)),
    db
      .select({ payment: payments, recordedBy: users.name })
      .from(payments)
      .leftJoin(users, eq(users.id, payments.recordedBy))
      .where(eq(payments.invoiceId, invoice.id))
      .orderBy(desc(payments.receivedAt)),
    db.select().from(releaseOrders).where(eq(releaseOrders.invoiceId, invoice.id)),
  ]);
  const invoiceMessages = sent.filter((m) => !m.releaseOrderId);
  const releaseMessages = sent.filter((m) => m.releaseOrderId);

  const balance = Number(invoice.totalTzs) - Number(invoice.amountPaid);
  const working = account?.status === "pending" || (account?.status === "created" && invoiceMessages.length === 0) || (!!releaseOrder && releaseMessages.length === 0);
  const facts = [
    ["Customer", customer.name],
    ["Phone", displayPhone(customer.phone)],
    ["Issued", formatDateTime(invoice.issuedAt)],
    ["Exchange rate", `$1 = ${formatNumber(invoice.usdRate)} TZS`],
    ["Total (TZS)", formatNumber(invoice.totalTzs)],
    ["Balance (TZS)", formatNumber(balance)],
  ];

  return (
    <>
      {working && <AutoRefresh />}
      <header className="border-b border-line px-6 py-5">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> Invoices
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{invoice.invoiceNo}</h1>
          <Badge tone={INVOICE_STATUS[invoice.status].tone}>{INVOICE_STATUS[invoice.status].label}</Badge>
          <a href={`/i/${invoice.pdfToken}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-tint-grey">
            Open PDF <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="grid gap-6 border-b border-line px-6 py-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line p-5">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">TCB payment account</h2>
            {account && <Badge tone={ACCOUNT_STATUS[account.status].tone}>{ACCOUNT_STATUS[account.status].label}</Badge>}
          </div>
          {account?.status === "created" && (
            <>
              <p className="mt-3 text-2xl font-semibold tracking-wider">{account.bankAccountNo}</p>
              <p className="mt-1 text-sm text-muted">
                {account.accountName} · Daraja ID {account.virtualAccountId}
              </p>
            </>
          )}
          {account?.status === "pending" && <p className="mt-3 text-sm text-muted">Opening the account through Daraja. This page updates by itself.</p>}
          {account?.status === "failed" && (
            <form action={retryAccountAction} className="mt-3">
              <p className="text-sm text-red-600">{account.error}</p>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <button className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Try again</button>
            </form>
          )}
          {account?.status === "uncertain" && (
            <div className="mt-3 text-sm">
              <p className="text-red-600">{account.error}</p>
              <p className="mt-2 text-muted">
                The bank may have opened the account anyway, so Zigopay won&apos;t retry. Ask Daraja ops to check reference <strong className="text-ink">{invoice.invoiceNo}</strong>.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line p-5">
          <h2 className="text-sm font-semibold">Sent to the customer</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {(["whatsapp", "sms"] as const).map((channel) => {
              const last = invoiceMessages.find((m) => m.channel === channel);
              const response = last?.providerResponse as { error?: string } | null;
              return (
                <li key={channel} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="w-20 font-medium">{channel === "sms" ? "SMS" : "WhatsApp"}</span>
                  {last ? (
                    <Badge tone={last.status === "sent" ? "green" : "red"}>{last.status === "sent" ? `Sent ${formatDateTime(last.createdAt)}` : "Not sent"}</Badge>
                  ) : (
                    <span className="text-muted">{account?.status === "created" ? "Sending…" : "Waits for the account"}</span>
                  )}
                  {account?.status === "created" && (
                    <form action={resendAction} className="ml-auto">
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="channel" value={channel} />
                      <button className="text-sm font-medium text-brand hover:underline">{last ? "Resend" : "Send"}</button>
                    </form>
                  )}
                  {last?.status === "failed" && response?.error && <p className="w-full text-xs text-red-600">{response.error}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {releaseOrder && (
        <section className="border-b border-line px-6 py-6">
          <div className="rounded-2xl border-2 border-brand bg-brand-soft p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-semibold">Release order</h2>
              <Badge tone={releaseOrder.collectedAt ? "grey" : "green"}>{releaseOrder.collectedAt ? `Collected ${formatDateTime(releaseOrder.collectedAt)}` : "Ready for collection"}</Badge>
              <a href={`/r/${releaseOrder.pdfToken}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
                Open release order PDF <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-wider">{releaseOrder.releaseNo}</p>
            <p className="mt-1 text-sm text-muted">Issued {formatDateTime(releaseOrder.issuedAt)}, automatically, when the invoice was fully paid.</p>
            <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {(["whatsapp", "sms"] as const).map((channel) => {
                const last = releaseMessages.find((m) => m.channel === channel);
                return (
                  <li key={channel} className="flex items-center gap-3">
                    <span className="font-medium">{channel === "sms" ? "SMS" : "WhatsApp"}</span>
                    {last ? <Badge tone={last.status === "sent" ? "green" : "red"}>{last.status === "sent" ? "Sent" : "Not sent"}</Badge> : <span className="text-muted">Sending…</span>}
                    <form action={resendReleaseOrderAction}>
                      <input type="hidden" name="releaseOrderId" value={releaseOrder.id} />
                      <input type="hidden" name="channel" value={channel} />
                      <button className="text-sm font-medium text-brand hover:underline">{last ? "Resend" : "Send"}</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <section className="border-b border-line">
        <div className="flex flex-wrap items-center gap-3 px-6 pt-6">
          <h2 className="text-sm font-medium">Payments received</h2>
          <span className="text-sm text-muted">
            TZS {formatNumber(invoice.amountPaid)} of {formatNumber(invoice.totalTzs)}
          </span>
        </div>
        <Table head={["Received", "Amount (TZS)", "To wallet (TZS)", "Payer", "Bank", "Source", "Daraja collection"]} empty={received.length === 0 ? "No payments yet." : undefined}>
          {received.map(({ payment: p, recordedBy }) => (
            <tr key={p.id}>
              <td>{formatDateTime(p.receivedAt)}</td>
              <td className="font-medium">{formatNumber(p.amount)}</td>
              <td>{Number(p.toWallet) > 0 ? formatNumber(p.toWallet) : "-"}</td>
              <td>{p.payerName ?? "-"}</td>
              <td>{p.payerBank ?? "-"}</td>
              <td>{p.source === "webhook" ? <Badge tone="blue">Daraja</Badge> : <Badge tone="yellow">{`Manual · ${recordedBy ?? "staff"}`}</Badge>}</td>
              <td className="text-xs text-muted">{p.collectionId ?? p.note ?? "-"}</td>
            </tr>
          ))}
        </Table>
        {invoice.status !== "paid" && (
          <div className="px-6 py-5">
            <ManualPayment invoiceId={invoice.id} balance={balance} now={new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 16)} />
          </div>
        )}
      </section>

      <h2 className="px-6 pt-6 text-sm font-medium">Cargo on this invoice</h2>
      <Table head={["Tracking number", "Description", "Packages", "Volume", "Price ($)", "Price (TZS)"]}>
        {items.map(({ item, trackingNo, description }) => (
          <tr key={item.id}>
            <td className="font-medium">{trackingNo}</td>
            <td>{description ?? "-"}</td>
            <td>{item.packages}</td>
            <td>
              {Number(item.volume)} {item.volumeUnit}
            </td>
            <td>{formatNumber(item.priceUsd)}</td>
            <td>{formatNumber(item.priceTzs)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
