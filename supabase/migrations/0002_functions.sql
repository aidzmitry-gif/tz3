-- ============================================================================
-- 0002_functions.sql
-- Серверная логика на стороне Postgres:
--   1) get_available_slots     — генерация свободных слотов
--   2) триггер на bookings     — постановка напоминания в очередь
--   3) claim_due_notifications — идемпотентный захват напоминаний к отправке
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_available_slots(service_id, date, tz)
--
-- Возвращает свободные слоты на конкретную дату с учётом:
--   • рабочих часов на этот день недели (working_hours),
--   • длительности услуги (шаг сетки = длительность, слоты встык),
--   • выходных/исключений (time_off) — если день в time_off, слотов нет,
--   • уже занятых подтверждённых броней (вычитаются пересечения),
--   • времени «сейчас» — слоты в прошлом не показываются.
--
-- Время считается в бизнес-зоне tz (например 'Europe/Moscow'): рабочие часы
-- заданы как локальное время, поэтому (date + start_time) интерпретируется в tz
-- и переводится в timestamptz через AT TIME ZONE.
-- ----------------------------------------------------------------------------
create or replace function get_available_slots(
  p_service_id uuid,
  p_date       date,
  p_tz         text default 'UTC'
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
as $$
  with svc as (
    select duration_min
    from services
    where id = p_service_id and is_active
  ),
  intervals as (
    -- рабочие окна на нужный день недели, переведённые в timestamptz
    select
      (p_date + wh.start_time)::timestamp at time zone p_tz as win_start,
      (p_date + wh.end_time)::timestamp   at time zone p_tz as win_end
    from working_hours wh
    where wh.weekday = extract(dow from p_date)::int
      and exists (select 1 from svc)
      and not exists (select 1 from time_off t where t.date = p_date)
  ),
  candidates as (
    select
      gs as s,
      gs + make_interval(mins => (select duration_min from svc)) as e
    from intervals i
    cross join lateral generate_series(
      i.win_start,
      i.win_end - make_interval(mins => (select duration_min from svc)),
      make_interval(mins => (select duration_min from svc))
    ) as gs
  )
  select c.s, c.e
  from candidates c
  where c.s > now()
    and not exists (
      select 1
      from bookings b
      where b.status = 'confirmed'
        and tstzrange(b.starts_at, b.ends_at) && tstzrange(c.s, c.e)
    )
  order by c.s;
$$;

-- ----------------------------------------------------------------------------
-- Триггер: при создании подтверждённой брони ставим напоминание в очередь.
-- Канал определяется по контакту: содержит '@' → email, иначе → telegram
-- (telegram chat_id). Время напоминания: starts_at минус REMINDER_LEAD.
-- ----------------------------------------------------------------------------
create or replace function schedule_booking_notifications()
returns trigger
language plpgsql
as $$
declare
  v_channel text;
  -- За сколько до записи слать напоминание. Меняйте при необходимости.
  v_lead interval := interval '2 hours';
begin
  if new.status = 'confirmed' then
    v_channel := case when new.client_contact ~ '@' then 'email' else 'telegram' end;

    insert into notifications (booking_id, channel, send_at, status)
    values (new.id, v_channel, new.starts_at - v_lead, 'pending');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_schedule_notifications on bookings;
create trigger trg_schedule_notifications
  after insert on bookings
  for each row
  execute function schedule_booking_notifications();

-- ----------------------------------------------------------------------------
-- claim_due_notifications(limit)
--
-- Атомарно «захватывает» напоминания, которым пора уходить:
-- переводит pending -> sending и возвращает их вместе с данными брони.
-- FOR UPDATE SKIP LOCKED + смена статуса гарантируют, что два параллельных
-- запуска воркера не возьмут одну и ту же строку (никаких двойных отправок).
-- ----------------------------------------------------------------------------
create or replace function claim_due_notifications(p_limit int default 50)
returns table (
  notification_id uuid,
  channel         text,
  client_name     text,
  client_contact  text,
  service_name    text,
  starts_at       timestamptz
)
language sql
as $$
  with due as (
    select id
    from notifications
    where status = 'pending'
      and send_at <= now()
    order by send_at
    limit p_limit
    for update skip locked
  ),
  claimed as (
    update notifications n
    set status = 'sending',
        attempts = n.attempts + 1
    from due
    where n.id = due.id
    returning n.id, n.channel, n.booking_id
  )
  select
    c.id,
    c.channel,
    b.client_name,
    b.client_contact,
    s.name,
    b.starts_at
  from claimed c
  join bookings b on b.id = c.booking_id
  join services s on s.id = b.service_id;
$$;
