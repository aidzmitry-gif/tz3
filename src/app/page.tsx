import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Service } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatPrice(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
}

export default async function HomePage() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const services = (data ?? []) as Service[];

  return (
    <div className="animate-fade-up">
      <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-clay">
        Онлайн-запись
      </p>
      <h1 className="max-w-xl font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
        Выберите услугу <span className="italic text-clay">и удобное</span> время.
      </h1>
      <p className="mt-4 max-w-md text-muted">
        Свободные слоты — в реальном времени. Один слот невозможно занять дважды,
        а напоминание придёт заранее.
      </p>

      {error && (
        <div className="mt-8 rounded-xl border border-clay/30 bg-clay-50 p-4 text-sm text-clay-700">
          Не удалось загрузить услуги. Проверьте подключение к базе и миграции.
        </div>
      )}

      {!error && services.length === 0 && (
        <div className="mt-8 card p-6 text-sm text-muted">
          Услуг пока нет. Добавьте их в{" "}
          <Link href="/admin" className="text-ink underline underline-offset-4">
            админке
          </Link>{" "}
          или загрузите <code className="rounded bg-ink/5 px-1.5 py-0.5">supabase/seed.sql</code>.
        </div>
      )}

      <ul className="mt-10 grid gap-3">
        {services.map((s, i) => (
          <li key={s.id} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-up">
            <Link
              href={`/book/${s.id}`}
              className="card group flex items-center justify-between gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div>
                <h2 className="font-display text-xl tracking-tight">{s.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {formatDuration(s.duration_min)} · {formatPrice(s.price)}
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/15 transition group-hover:border-clay group-hover:bg-clay group-hover:text-paper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
