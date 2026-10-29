import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Shipment Management · Zigopay" };

export default function Page() {
  return (
    <>
      <PageHeader title="Shipment Management" action={{ label: "New Shipment", href: "/shipments/new" }} />
      <ComingSoon what="Shipment list and the new shipment form" milestone={2} />
    </>
  );
}
