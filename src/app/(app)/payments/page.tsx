import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Payments · Zigopay" };

export default function Page() {
  return (
    <>
      <PageHeader title="Payments" />
      <ComingSoon what="Payments received from Daraja" milestone={4} />
    </>
  );
}
