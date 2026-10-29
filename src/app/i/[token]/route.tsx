import { renderToBuffer } from "@react-pdf/renderer";
import { invoiceForPdf } from "@/pdf/invoice-data";
import { InvoicePdf } from "@/pdf/invoice-pdf";

export const dynamic = "force-dynamic";

/** The customer's invoice PDF. Public: the 10-character token in the link is the only key. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.pdf$/, "");
  if (!/^[A-Za-z0-9]{10}$/.test(token)) return new Response("Not found", { status: 404 });

  const data = await invoiceForPdf(token);
  if (!data) return new Response("Not found", { status: 404 });

  const pdf = await renderToBuffer(<InvoicePdf data={data} />);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.invoice.invoiceNo}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
