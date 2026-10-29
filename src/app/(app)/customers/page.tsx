import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Customers · Zigopay" };

export default function Page() {
  return (
    <>
      <PageHeader title="Customers" action={{ label: "New Customer", href: "/customers/new" }} />
      <ComingSoon what="Customer list and the new customer form" milestone={2} />
    </>
  );
}
