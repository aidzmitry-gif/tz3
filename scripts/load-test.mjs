#!/usr/bin/env node
/**
 * Нагрузочная проверка защиты от двойной брони.
 *
 *   node scripts/load-test.mjs
 *
 * Что делает:
 *   1. Берёт первую услугу.
 *   2. Находит ближайшую дату со свободными слотами.
 *   3. Одновременно отправляет CONCURRENCY запросов на ОДИН и тот же слот.
 *   4. Ожидает ровно 1 успех (201) и остальные — конфликт (409).
 *
 * Переменные: BASE_URL (по умолчанию http://localhost:3000), CONCURRENCY (20).
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "20", 10);

const log = (...a) => console.log(...a);

async function getJson(path, init) {
  const res = await fetch(`${BASE_URL}${path}`, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, body };
}

function nextDateKey(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main() {
  log(`→ Сервер: ${BASE_URL}, параллелизм: ${CONCURRENCY}\n`);

  const services = await getJson("/api/services");
  if (services.status !== 200 || !services.body?.services?.length) {
    throw new Error("Нет услуг. Загрузите supabase/seed.sql и запустите сервер.");
  }
  const service = services.body.services[0];
  log(`Услуга: ${service.name} (${service.duration_min} мин)`);

  // Ищем дату со свободными слотами в ближайшие 14 дней.
  let slot = null;
  let usedDate = null;
  for (let i = 0; i <= 14 && !slot; i++) {
    const date = nextDateKey(i);
    const r = await getJson(`/api/slots?serviceId=${service.id}&date=${date}`);
    if (r.status === 200 && r.body?.slots?.length) {
      slot = r.body.slots[0];
      usedDate = date;
    }
  }
  if (!slot) throw new Error("Не нашёл свободных слотов в ближайшие 14 дней.");
  log(`Слот: ${usedDate} ${slot.starts_at}\n`);

  // Параллельный штурм одного слота.
  const requests = Array.from({ length: CONCURRENCY }, (_, i) =>
    getJson("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: service.id,
        startsAt: slot.starts_at,
        clientName: `Клиент ${i + 1}`,
        clientContact: `client${i + 1}@example.com`,
      }),
    })
  );

  const results = await Promise.all(requests);
  const created = results.filter((r) => r.status === 201).length;
  const conflicts = results.filter((r) => r.status === 409).length;
  const other = results.filter((r) => r.status !== 201 && r.status !== 409);

  log(`Создано (201):    ${created}`);
  log(`Конфликтов (409): ${conflicts}`);
  if (other.length) log(`Прочее:           ${other.map((r) => r.status).join(", ")}`);

  log("");
  if (created === 1 && conflicts === CONCURRENCY - 1) {
    log("✅ УСПЕХ: слот забронирован ровно один раз.");
    process.exit(0);
  } else {
    log("❌ ПРОВАЛ: ожидалось ровно 1 успешное бронирование.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Ошибка теста:", e.message);
  process.exit(1);
});
