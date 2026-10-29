import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Invoices · Zigopay" };

export default function Page() {
  return (
    <>
      <PageHeader title="Invoices" action={{ label: "Create invoice", href: "/invoices/new" }} />
      <ComingSoon what="Invoices, with PDF and sending" milestone={3} />
    </>
  );
}
