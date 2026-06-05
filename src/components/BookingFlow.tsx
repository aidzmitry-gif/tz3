"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar } from "@/components/Calendar";
import {
  formatSlotTime,
  getUserTimeZone,
  timeZoneAbbrev,
  WEEKDAYS_RU,
  MONTHS_RU,
} from "@/lib/time";
import type { Service, Slot } from "@/lib/types";

type Props = { service: Service };

function dateKeyLong(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${d} ${MONTHS_RU[m - 1]} ${y}, ${WEEKDAYS_RU[date.getDay()].toLowerCase()}`;
}

type Confirmed = { time: string; date: string };

export function BookingFlow({ service }: Props) {
  const [tz, setTz] = useState<string>("UTC");
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  useEffect(() => setTz(getUserTimeZone()), []);

  const loadSlots = useCallback(
    async (dateKey: string) => {
      setLoadingSlots(true);
      setSlot(null);
      setError(null);
      try {
        const res = await fetch(
          `/api/slots?serviceId=${service.id}&date=${dateKey}`
        );
        const json = await res.json();
        setSlots(res.ok ? json.slots : []);
        if (!res.ok) setError(json.error ?? "Не удалось загрузить слоты");
      } catch {
        setError("Сеть недоступна. Попробуйте ещё раз.");
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [service.id]
  );

  function onSelectDate(dateKey: string) {
    setDate(dateKey);
    setConfirmed(null);
    void loadSlots(dateKey);
  }

  async function submit() {
    if (!slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          startsAt: slot.starts_at,
          clientName: name,
          clientContact: contact,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setConfirmed({
          time: formatSlotTime(slot.starts_at, tz),
          date: date ? dateKeyLong(date) : "",
        });
        setSlot(null);
        if (date) void loadSlots(date); // обновим сетку — слот теперь занят
      } else {
        setError(json.error ?? "Не удалось создать бронь");
        if (res.status === 409 && date) {
          // слот заняли параллельно — перезагрузим доступные
          setSlot(null);
          void loadSlots(date);
        }
      }
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  const contactLooksEmail = contact.includes("@");

  if (confirmed) {
    return (
      <div className="mt-8 animate-fade-up card p-7 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-sage/15 text-sage">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h2 className="font-display text-2xl tracking-tight">Вы записаны!</h2>
        <p className="mt-2 text-muted">
          {service.name} · {confirmed.date}
          <br />
          в {confirmed.time} ({timeZoneAbbrev(tz)})
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm text-muted">
          Напоминание придёт на «{contact}» за 2 часа до визита.
        </p>
        <button
          type="button"
          onClick={() => {
            setConfirmed(null);
            setName("");
            setContact("");
          }}
          className="btn-ghost mt-6"
        >
          Записаться ещё раз
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6">
      <div>
        <p className="label">1 · Дата</p>
        <Calendar selected={date} onSelect={onSelectDate} />
      </div>

      {date && (
        <div className="animate-fade-up">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="label mb-0">2 · Время</p>
            <span className="text-xs text-muted">
              ваш пояс: {tz} ({timeZoneAbbrev(tz)})
            </span>
          </div>

          <div className="card p-5">
            <p className="mb-3 font-display text-lg tracking-tight">
              {dateKeyLong(date)}
            </p>

            {loadingSlots ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-ink/5" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="py-4 text-sm text-muted">
                На этот день свободных слотов нет. Выберите другую дату.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => {
                  const active = slot?.starts_at === s.starts_at;
                  return (
                    <button
                      key={s.starts_at}
                      type="button"
                      onClick={() => {
                        setSlot(s);
                        setError(null);
                      }}
                      className={[
                        "rounded-lg border px-2 py-2.5 text-sm font-medium transition",
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-ink/15 hover:border-clay hover:bg-clay-50",
                      ].join(" ")}
                    >
                      {formatSlotTime(s.starts_at, tz)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {slot && (
        <div className="animate-fade-up">
          <p className="label">3 · Ваши данные</p>
          <div className="card grid gap-4 p-5">
            <div>
              <label className="label" htmlFor="name">Имя</label>
              <input
                id="name"
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как к вам обращаться"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="label" htmlFor="contact">
                Email или Telegram chat_id
              </label>
              <input
                id="contact"
                className="field"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="you@example.com или 123456789"
              />
              <p className="mt-1.5 text-xs text-muted">
                Напоминание придёт {contactLooksEmail ? "на email" : "в Telegram"}.
              </p>
            </div>

            {error && (
              <p className="rounded-lg border border-clay/30 bg-clay-50 px-3 py-2 text-sm text-clay-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting || name.trim().length === 0 || contact.trim().length < 3}
              className="btn-primary"
            >
              {submitting ? "Записываем…" : `Записаться на ${formatSlotTime(slot.starts_at, tz)}`}
            </button>
          </div>
        </div>
      )}

      {error && !slot && (
        <p className="rounded-lg border border-clay/30 bg-clay-50 px-3 py-2 text-sm text-clay-700">
          {error}
        </p>
      )}
    </div>
  );
}
