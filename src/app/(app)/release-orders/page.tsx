import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Release orders · Zigopay" };

export default function Page() {
  return (
    <>
      <PageHeader title="Release orders" />
      <ComingSoon what="Release orders and collection" milestone={4} />
    </>
  );
}
