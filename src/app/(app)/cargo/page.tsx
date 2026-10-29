import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Cargo Management · Zigopay" };

export default function Page() {
  return (
    <>
      <PageHeader title="Cargo Management" action={{ label: "New Cargo", href: "/cargo/new" }} />
      <ComingSoon what="Cargo list and the new cargo form" milestone={2} />
    </>
  );
}
