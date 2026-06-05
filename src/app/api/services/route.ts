import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Service } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/services — список активных услуг. */
export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("list services error:", error);
    return NextResponse.json({ error: "Не удалось получить услуги" }, { status: 500 });
  }
  return NextResponse.json({ services: (data ?? []) as Service[] });
}
