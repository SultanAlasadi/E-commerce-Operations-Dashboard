import { requirePermission } from "@/lib/auth/membership";
import { EntryPage } from "../_components/entry-page";

export default async function NewSalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePermission("ADD_SALES");
  return <EntryPage ctx={ctx} searchParams={await searchParams} />;
}
