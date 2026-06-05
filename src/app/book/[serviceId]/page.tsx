import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Service } from "@/lib/types";
import { BookingFlow } from "@/components/BookingFlow";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
}: {
  params: { serviceId: string };
}) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("id", params.serviceId)
    .eq("is_active", true)
    .maybeSingle();

  const service = data as Service | null;
  if (!service) notFound();

  return (
    <div className="animate-fade-up">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
        Все услуги
      </Link>

      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
        {service.name}
      </h1>

      <BookingFlow service={service} />
    </div>
  );
}
