import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { sendNotification } from "@/lib/notifications";
import type { ClaimedNotification } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ATTEMPTS = 3;

/**
 * POST (или GET) /api/cron/send-reminders
 * Вызывается планировщиком раз в минуту (Vercel Cron или pg_cron).
 *
 * Идемпотентность: claim_due_notifications атомарно переводит pending->sending
 * с FOR UPDATE SKIP LOCKED, поэтому даже при параллельных запусках одно
 * напоминание не уйдёт дважды. После успешной отправки -> sent. При ошибке:
 * вернуть в pending для повторной попытки (до MAX_ATTEMPTS), затем -> failed.
 */
async function handle(req: NextRequest) {
  // Защита эндпойнта секретом.
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("claim_due_notifications", {
    p_limit: 50,
  });
  if (error) {
    console.error("claim_due_notifications error:", error);
    return NextResponse.json({ error: "claim failed" }, { status: 500 });
  }

  const claimed = (data ?? []) as ClaimedNotification[];
  const tz = env.businessTimezone();
  let sent = 0;
  let failed = 0;

  for (const n of claimed) {
    try {
      await sendNotification(n, tz);
      await supabase
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", n.notification_id);
      sent++;
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      console.error(`notification ${n.notification_id} failed:`, message);

      // attempts уже увеличен внутри claim. Решаем: повтор или окончательный провал.
      const { data: row } = await supabase
        .from("notifications")
        .select("attempts")
        .eq("id", n.notification_id)
        .single<{ attempts: number }>();

      const nextStatus =
        (row?.attempts ?? MAX_ATTEMPTS) >= MAX_ATTEMPTS ? "failed" : "pending";

      await supabase
        .from("notifications")
        .update({ status: nextStatus, error: message })
        .eq("id", n.notification_id);
    }
  }

  return NextResponse.json({ claimed: claimed.length, sent, failed });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
