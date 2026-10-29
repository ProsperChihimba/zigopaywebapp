import { renderToBuffer } from "@react-pdf/renderer";
import { releaseOrderForPdf } from "@/pdf/release-order-data";
import { ReleaseOrderPdf } from "@/pdf/release-order-pdf";

export const dynamic = "force-dynamic";

/** The customer's release order PDF. Public: the 10-character token in the link is the only key. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.pdf$/, "");
  if (!/^[A-Za-z0-9]{10}$/.test(token)) return new Response("Not found", { status: 404 });

  const data = await releaseOrderForPdf(token);
  if (!data) return new Response("Not found", { status: 404 });

  const pdf = await renderToBuffer(<ReleaseOrderPdf data={data} />);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.ro.releaseNo}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
