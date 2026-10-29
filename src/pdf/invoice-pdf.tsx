import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoicePdfData } from "./invoice-data";

const green = "#3fa34d";
const line = "#d9d9d9";
const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  row: { flexDirection: "row" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderColor: "#1a1a1a", paddingBottom: 10 },
  company: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  muted: { color: "#6b6b6b" },
  box: { borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 6, padding: 10, marginTop: 10 },
  label: { width: 70, color: "#6b6b6b" },
  bold: { fontFamily: "Helvetica-Bold" },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  cell: { paddingVertical: 5, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: line },
  pay: { borderWidth: 2, borderColor: green, borderRadius: 6, padding: 12, marginTop: 14, backgroundColor: "#eef6ec" },
  account: { fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginVertical: 4 },
});

const cols = [
  { key: "sn", title: "SN", width: "5%" },
  { key: "tracking", title: "Tracking No", width: "17%" },
  { key: "desc", title: "Cargo description", width: "26%" },
  { key: "pkg", title: "No. of Pkg", width: "9%", right: true },
  { key: "vol", title: "Volume", width: "11%", right: true },
  { key: "usd", title: "Price (USD)", width: "14%", right: true },
  { key: "tzs", title: "Price (TZS)", width: "18%", right: true },
] as const;

const money = (n: string | number, digits = 0) => Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const eat = (d: Date) =>
  d.toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const { invoice, customer, company, account, items } = data;
  const totalUsd = items.reduce((t, r) => t + Number(r.item.priceUsd), 0);
  const totalPkg = items.reduce((t, r) => t + r.item.packages, 0);
  const balance = Number(invoice.totalTzs) - Number(invoice.amountPaid);
  const cell = (c: (typeof cols)[number]) => [s.cell, { width: c.width, textAlign: "right" in c ? ("right" as const) : ("left" as const) }];

  return (
    <Document title={`${invoice.invoiceNo} · ${company.name}`} author={company.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.company}>{company.name.toUpperCase()}</Text>
            {company.tin && <Text style={s.muted}>TIN {company.tin}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {company.address?.split(",").map((part) => <Text key={part}>{part.trim()}</Text>)}
            {company.phone && <Text>Call: {company.phone}</Text>}
          </View>
        </View>

        <View style={[s.row, { justifyContent: "space-between", marginTop: 8 }]}>
          <Text style={s.bold}>CLIENT BILL NOTE</Text>
          <Text>{eat(invoice.issuedAt)}</Text>
        </View>

        <View style={[s.box, s.row]}>
          <View style={{ flex: 1.2 }}>
            <View style={s.row}>
              <Text style={s.label}>Client:</Text>
              <Text style={s.bold}>{customer.name}</Text>
            </View>
            <View style={[s.row, { marginTop: 6 }]}>
              <Text style={s.label}>Phone:</Text>
              <Text style={s.bold}>{customer.phone}</Text>
            </View>
          </View>
          <View style={{ flex: 1, borderLeftWidth: 1, borderColor: "#1a1a1a", paddingLeft: 10 }}>
            <View style={s.row}>
              <Text style={s.label}>Currency:</Text>
              <Text style={s.bold}>TZS</Text>
            </View>
            <View style={[s.row, { marginTop: 6 }]}>
              <Text style={s.label}>Exchange rate:</Text>
              <Text style={s.bold}>$1 = {money(invoice.usdRate)} TZS</Text>
            </View>
          </View>
          <View style={{ flex: 1, borderLeftWidth: 1, borderColor: "#1a1a1a", paddingLeft: 10 }}>
            <Text style={s.muted}>Invoice No:</Text>
            <Text style={[s.bold, { fontSize: 14, marginTop: 2 }]}>{invoice.invoiceNo}</Text>
          </View>
        </View>

        <View style={[s.box, { padding: 0 }]}>
          <View style={[s.tableRow, { borderColor: "#1a1a1a" }]}>
            {cols.map((c) => (
              <Text key={c.key} style={[...cell(c), s.th]}>
                {c.title}
              </Text>
            ))}
          </View>
          {items.map((r, i) => {
            const values = [
              String(i + 1),
              r.trackingNo,
              r.description ?? "-",
              String(r.item.packages),
              `${Number(r.item.volume)} ${r.item.volumeUnit}`,
              money(r.item.priceUsd, 2),
              money(r.item.priceTzs),
            ];
            return (
              <View key={r.item.id} style={s.tableRow} wrap={false}>
                {cols.map((c, j) => (
                  <Text key={c.key} style={cell(c)}>
                    {values[j]}
                  </Text>
                ))}
              </View>
            );
          })}
          <View style={[s.row, s.bold]}>
            <Text style={[s.cell, { width: "48%", textAlign: "right" }, s.bold]}>Total</Text>
            <Text style={[s.cell, { width: "9%", textAlign: "right" }, s.bold]}>{totalPkg}</Text>
            <Text style={[s.cell, { width: "11%" }]} />
            <Text style={[s.cell, { width: "14%", textAlign: "right" }, s.bold]}>{money(totalUsd, 2)}</Text>
            <Text style={[s.cell, { width: "18%", textAlign: "right" }, s.bold]}>{money(invoice.totalTzs)}</Text>
          </View>
        </View>

        <View style={s.pay} wrap={false}>
          <Text style={s.bold}>PAYMENT METHOD / NAMNA YA KULIPA</Text>
          {account?.status === "created" && account.bankAccountNo ? (
            <>
              <Text style={{ marginTop: 6 }}>Pay from any bank or mobile wallet to this TCB account. / Lipa kupitia benki yoyote au simu kwenye akaunti hii ya TCB.</Text>
              <Text style={s.account}>{account.bankAccountNo}</Text>
              <Text>
                Bank: TCB Bank · Account name: <Text style={s.bold}>{account.accountName ?? company.name}</Text>
              </Text>
              <Text style={{ marginTop: 6 }}>
                Amount to pay / Kiasi cha kulipa: <Text style={s.bold}>TZS {money(balance)}</Text>
              </Text>
              <Text style={[s.muted, { marginTop: 6 }]}>Your release order is sent automatically once the full amount is received. / Hati ya kuchukua mzigo itatumwa mara malipo kamili yakipokelewa.</Text>
            </>
          ) : (
            <Text style={{ marginTop: 6 }}>The payment account is being prepared. Please contact {company.name}{company.phone ? ` on ${company.phone}` : ""} before paying.</Text>
          )}
        </View>

        {company.invoiceTerms && (
          <View style={{ marginTop: 16 }}>
            <Text style={s.bold}>Terms and Conditions</Text>
            {company.invoiceTerms.split("\n").map((t, i) => (
              <Text key={i} style={{ marginTop: 3 }}>
                {i + 1}. {t}
              </Text>
            ))}
          </View>
        )}
        <Text style={[s.muted, { position: "absolute", bottom: 24, left: 36, fontSize: 7 }]} fixed>
          Generated by Zigopay
        </Text>
      </Page>
    </Document>
  );
}
