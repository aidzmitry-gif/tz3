import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { formatInTimeZone } from "date-fns-tz";
import { ru } from "date-fns/locale";
import { WEEKDAYS_RU } from "@/lib/time";
import type { Service, WorkingHour, TimeOff } from "@/lib/types";
import {
  addService,
  toggleService,
  addWorkingHour,
  deleteWorkingHour,
  addTimeOff,
  deleteTimeOff,
  cancelBooking,
} from "./actions";

export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  client_name: string;
  client_contact: string;
  starts_at: string;
  ends_at: string;
  status: string;
  services: { name: string } | { name: string }[] | null;
};

function serviceName(row: BookingRow): string {
  if (!row.services) return "—";
  return Array.isArray(row.services) ? row.services[0]?.name ?? "—" : row.services.name;
}

export default async function AdminPage() {
  const supabase = getSupabaseAdmin();
  const tz = env.businessTimezone();

  const [{ data: services }, { data: hours }, { data: timeOff }, { data: bookings }] =
    await Promise.all([
      supabase.from("services").select("*").order("created_at"),
      supabase.from("working_hours").select("*").order("weekday").order("start_time"),
      supabase.from("time_off").select("*").order("date"),
      supabase
        .from("bookings")
        .select("id, client_name, client_contact, starts_at, ends_at, status, services(name)")
        .eq("status", "confirmed")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(50),
    ]);

  const svc = (services ?? []) as Service[];
  const wh = (hours ?? []) as WorkingHour[];
  const off = (timeOff ?? []) as TimeOff[];
  const bk = (bookings ?? []) as BookingRow[];

  return (
    <div className="animate-fade-up grid gap-10">
      <div>
        <Link href="/" className="text-sm text-muted transition hover:text-ink">
          ← На сайт
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">Админка</h1>
        <p className="mt-1 text-sm text-muted">
          Рабочее время задаётся в зоне <code className="rounded bg-ink/5 px-1.5 py-0.5">{tz}</code>.
        </p>
      </div>

      {/* Услуги */}
      <section className="card p-6">
        <h2 className="font-display text-xl tracking-tight">Услуги</h2>
        <ul className="mt-4 divide-y divide-ink/10">
          {svc.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="text-sm">
                <span className={s.is_active ? "" : "text-muted line-through"}>{s.name}</span>
                <span className="text-muted"> · {s.duration_min} мин · {s.price} ₽</span>
              </div>
              <form action={toggleService}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="is_active" value={(!s.is_active).toString()} />
                <button className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
                  {s.is_active ? "Скрыть" : "Показать"}
                </button>
              </form>
            </li>
          ))}
          {svc.length === 0 && <li className="py-2 text-sm text-muted">Пока нет услуг.</li>}
        </ul>

        <form action={addService} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <input name="name" required placeholder="Название" className="field" />
          <input name="duration_min" required type="number" min="1" placeholder="Мин" className="field sm:w-24" />
          <input name="price" type="number" min="0" step="1" placeholder="₽" className="field sm:w-28" />
          <button className="btn-primary">Добавить</button>
        </form>
      </section>

      {/* Рабочие часы */}
      <section className="card p-6">
        <h2 className="font-display text-xl tracking-tight">Рабочие часы</h2>
        <ul className="mt-4 divide-y divide-ink/10">
          {wh.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span>
                <span className="font-medium">{WEEKDAYS_RU[h.weekday]}</span>{" "}
                <span className="text-muted">
                  {h.start_time.slice(0, 5)}–{h.end_time.slice(0, 5)}
                </span>
              </span>
              <form action={deleteWorkingHour}>
                <input type="hidden" name="id" value={h.id} />
                <button className="text-xs text-muted hover:text-clay">Удалить</button>
              </form>
            </li>
          ))}
          {wh.length === 0 && <li className="py-2 text-sm text-muted">Расписание не задано.</li>}
        </ul>

        <form action={addWorkingHour} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <select name="weekday" className="field" defaultValue="1">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <option key={d} value={d}>{WEEKDAYS_RU[d]}</option>
            ))}
          </select>
          <input name="start_time" type="time" required defaultValue="10:00" className="field" />
          <input name="end_time" type="time" required defaultValue="19:00" className="field" />
          <button className="btn-primary">Добавить</button>
        </form>
      </section>

      {/* Выходные */}
      <section className="card p-6">
        <h2 className="font-display text-xl tracking-tight">Выходные и исключения</h2>
        <ul className="mt-4 divide-y divide-ink/10">
          {off.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span>
                <span className="font-medium">{t.date}</span>
                {t.reason ? <span className="text-muted"> · {t.reason}</span> : null}
              </span>
              <form action={deleteTimeOff}>
                <input type="hidden" name="id" value={t.id} />
                <button className="text-xs text-muted hover:text-clay">Удалить</button>
              </form>
            </li>
          ))}
          {off.length === 0 && <li className="py-2 text-sm text-muted">Исключений нет.</li>}
        </ul>

        <form action={addTimeOff} className="mt-4 grid gap-2 sm:grid-cols-[auto_1fr_auto]">
          <input name="date" type="date" required className="field" />
          <input name="reason" placeholder="Причина (необязательно)" className="field" />
          <button className="btn-primary">Добавить</button>
        </form>
      </section>

      {/* Ближайшие записи */}
      <section className="card p-6">
        <h2 className="font-display text-xl tracking-tight">Ближайшие записи</h2>
        <ul className="mt-4 divide-y divide-ink/10">
          {bk.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {formatInTimeZone(new Date(b.starts_at), tz, "d MMM, HH:mm", { locale: ru })}
                  {" — "}
                  {formatInTimeZone(new Date(b.ends_at), tz, "HH:mm", { locale: ru })}
                </p>
                <p className="text-muted">
                  {serviceName(b)} · {b.client_name} · {b.client_contact}
                </p>
              </div>
              <form action={cancelBooking}>
                <input type="hidden" name="id" value={b.id} />
                <button className="text-xs text-muted hover:text-clay">Отменить</button>
              </form>
            </li>
          ))}
          {bk.length === 0 && <li className="py-2 text-sm text-muted">Записей нет.</li>}
        </ul>
      </section>
    </div>
  );
}
