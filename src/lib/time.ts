import { formatInTimeZone } from "date-fns-tz";
import { ru } from "date-fns/locale";

/**
 * Помощники для времени. Хранение — всегда UTC (timestamptz в БД, ISO-строки
 * в JS). Отображение — в нужной зоне. По умолчанию это локальная зона браузера
 * пользователя, поэтому один и тот же слот корректно виден из любой точки мира.
 */

export const WEEKDAYS_RU = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];

export const WEEKDAYS_SHORT_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

export const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** Локальная зона пользователя, например 'Europe/Moscow' или 'America/Los_Angeles'. */
export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** 'YYYY-MM-DD' для произвольной даты по её локальным полям (для ключей календаря). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Время слота 'HH:mm' в указанной зоне. */
export function formatSlotTime(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "HH:mm");
}

/** Диапазон '14:00 – 15:00' в указанной зоне. */
export function formatSlotRange(startIso: string, endIso: string, tz: string): string {
  return `${formatSlotTime(startIso, tz)} – ${formatSlotTime(endIso, tz)}`;
}

/** Длинная дата 'пятница, 5 июня 2026' в указанной зоне. */
export function formatDayLong(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "EEEE, d MMMM yyyy", { locale: ru });
}

/** Короткая подпись зоны для интерфейса, например 'GMT+3'. */
export function timeZoneAbbrev(tz: string): string {
  try {
    return formatInTimeZone(new Date(), tz, "OOO");
  } catch {
    return tz;
  }
}
