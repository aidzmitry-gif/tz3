import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { Slot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата в формате YYYY-MM-DD"),
});

/**
 * GET /api/slots?serviceId=...&date=YYYY-MM-DD
 * Возвращает свободные слоты на дату. Вся логика — в SQL-функции
 * get_available_slots, время считается в бизнес-зоне сервера.
 */
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Неверные параметры" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_service_id: parsed.data.serviceId,
    p_date: parsed.data.date,
    p_tz: env.businessTimezone(),
  });

  if (error) {
    console.error("get_available_slots error:", error);
    return NextResponse.json({ error: "Не удалось получить слоты" }, { status: 500 });
  }

  return NextResponse.json({ slots: (data ?? []) as Slot[] });
}
