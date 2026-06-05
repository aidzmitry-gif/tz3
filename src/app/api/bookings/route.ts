import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Service } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  serviceId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }), // ISO с зоной, например 2026-06-10T08:00:00.000Z
  clientName: z.string().trim().min(1, "Укажите имя").max(120),
  clientContact: z.string().trim().min(3, "Укажите контакт (email или Telegram)").max(200),
});

/**
 * POST /api/bookings
 * Создаёт бронь. Защита от двойной брони — на уровне БД (EXCLUDE-ограничение
 * no_overlap). Если слот уже занят, Postgres вернёт ошибку 23P01, которую мы
 * превращаем в 409 Conflict. Никаких блокировок в приложении не нужно.
 *
 * ends_at вычисляется на сервере из длительности услуги — клиент не может
 * подделать продолжительность.
 */
export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Неверные данные" },
      { status: 400 }
    );
  }
  const { serviceId, startsAt, clientName, clientContact } = parsed.data;

  const supabase = getSupabaseAdmin();

  // 1. Берём актуальную длительность услуги (источник истины — БД).
  const { data: service, error: svcError } = await supabase
    .from("services")
    .select("id, duration_min, is_active")
    .eq("id", serviceId)
    .single<Pick<Service, "id" | "duration_min" | "is_active">>();

  if (svcError || !service || !service.is_active) {
    return NextResponse.json({ error: "Услуга не найдена" }, { status: 404 });
  }

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Нельзя записаться в прошлое" }, { status: 400 });
  }
  const end = new Date(start.getTime() + service.duration_min * 60_000);

  // 2. Вставка. Если интервал пересекается с подтверждённой бронью — 23P01.
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      service_id: serviceId,
      client_name: clientName,
      client_contact: clientContact,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "confirmed",
    })
    .select("id, starts_at, ends_at, status")
    .single();

  if (error) {
    // 23P01 = exclusion_violation: слот уже забронирован.
    if (error.code === "23P01") {
      return NextResponse.json(
        { error: "Этот слот только что заняли. Выберите другое время." },
        { status: 409 }
      );
    }
    console.error("create booking error:", error);
    return NextResponse.json({ error: "Не удалось создать бронь" }, { status: 500 });
  }

  return NextResponse.json({ booking }, { status: 201 });
}
