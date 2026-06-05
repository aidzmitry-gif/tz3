-- ============================================================================
-- 0001_schema.sql
-- Базовая схема системы онлайн-записи.
--
-- Главная идея защиты от двойной брони: ограничение EXCLUDE на пересечение
-- интервалов времени. Postgres физически не даст вставить две пересекающиеся
-- активные брони — это работает даже при параллельных запросах, без блокировок
-- на стороне приложения.
-- ============================================================================

-- Нужно для EXCLUDE ... USING gist. Диапазонные типы (tstzrange) индексируются
-- gist-ом из коробки, но btree_gist позволяет в будущем добавить в ограничение
-- скалярные колонки (например resource_id WITH =) для мультиресурсной записи.
create extension if not exists btree_gist;

-- ----------------------------------------------------------------------------
-- services — услуги, на которые можно записаться
-- ----------------------------------------------------------------------------
create table if not exists services (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  duration_min  int  not null check (duration_min > 0),
  price         numeric(10, 2) not null default 0 check (price >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- working_hours — шаблон рабочего расписания по дням недели
-- weekday: 0 = воскресенье ... 6 = суббота  (совпадает с JS Date.getDay()
--          и с Postgres extract(dow ...)).
-- Можно задать несколько интервалов на один день (например, до и после обеда).
-- ----------------------------------------------------------------------------
create table if not exists working_hours (
  id          uuid primary key default gen_random_uuid(),
  weekday     int  not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);

-- ----------------------------------------------------------------------------
-- time_off — выходные и разовые исключения (день целиком недоступен)
-- ----------------------------------------------------------------------------
create table if not exists time_off (
  id      uuid primary key default gen_random_uuid(),
  date    date not null unique,
  reason  text
);

-- ----------------------------------------------------------------------------
-- bookings — брони
--
-- starts_at / ends_at хранятся в timestamptz (фактически UTC). Конвертация в
-- локальную зону пользователя делается только при отображении.
--
-- no_overlap: партиционированное (partial) EXCLUDE-ограничение. Оно запрещает
-- пересечение интервалов ТОЛЬКО среди подтверждённых броней (status='confirmed').
-- Отменённые брони слот не занимают. Диапазон tstzrange по умолчанию '[)' —
-- начало включается, конец исключается, поэтому стык 10:00–11:00 и 11:00–12:00
-- пересечением НЕ считается.
-- ----------------------------------------------------------------------------
create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  service_id      uuid not null references services(id) on delete restrict,
  client_name     text not null,
  client_contact  text not null,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          text not null default 'confirmed'
                  check (status in ('confirmed', 'cancelled', 'completed')),
  created_at      timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint no_overlap exclude using gist (
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed')
);

create index if not exists idx_bookings_starts_at on bookings (starts_at);
create index if not exists idx_bookings_status on bookings (status);

-- ----------------------------------------------------------------------------
-- notifications — очередь напоминаний
-- status: pending -> sending -> sent | failed
-- Идемпотентность отправки обеспечивается атомарным «захватом» строки
-- (pending -> sending) с FOR UPDATE SKIP LOCKED, см. claim_due_notifications().
-- ----------------------------------------------------------------------------
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  channel     text not null check (channel in ('telegram', 'email')),
  send_at     timestamptz not null,
  sent_at     timestamptz,
  status      text not null default 'pending'
              check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts    int  not null default 0,
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_due
  on notifications (send_at)
  where status = 'pending';

-- ----------------------------------------------------------------------------
-- Row Level Security
-- Всё обращение к БД идёт из серверной части Next.js под service_role ключом,
-- который RLS обходит. Поэтому включаем RLS и НЕ создаём политик —
-- анонимный (anon) ключ не получит доступа ни к чему. Браузер с БД напрямую
-- не общается.
-- ----------------------------------------------------------------------------
alter table services       enable row level security;
alter table working_hours  enable row level security;
alter table time_off       enable row level security;
alter table bookings       enable row level security;
alter table notifications  enable row level security;
