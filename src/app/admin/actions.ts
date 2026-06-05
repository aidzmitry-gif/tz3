"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export async function addService(form: FormData) {
  const name = str(form, "name");
  const duration = parseInt(str(form, "duration_min"), 10);
  const price = parseFloat(str(form, "price") || "0");
  if (!name || !Number.isFinite(duration) || duration <= 0) return;

  await getSupabaseAdmin().from("services").insert({
    name,
    duration_min: duration,
    price: Number.isFinite(price) ? price : 0,
  });
  revalidatePath("/admin");
}

export async function toggleService(form: FormData) {
  const id = str(form, "id");
  const next = str(form, "is_active") === "true"; // целевое значение
  if (!id) return;
  await getSupabaseAdmin().from("services").update({ is_active: next }).eq("id", id);
  revalidatePath("/admin");
}

export async function addWorkingHour(form: FormData) {
  const weekday = parseInt(str(form, "weekday"), 10);
  const start = str(form, "start_time");
  const end = str(form, "end_time");
  if (!Number.isInteger(weekday) || !start || !end || end <= start) return;

  await getSupabaseAdmin().from("working_hours").insert({
    weekday,
    start_time: start,
    end_time: end,
  });
  revalidatePath("/admin");
}

export async function deleteWorkingHour(form: FormData) {
  const id = str(form, "id");
  if (!id) return;
  await getSupabaseAdmin().from("working_hours").delete().eq("id", id);
  revalidatePath("/admin");
}

export async function addTimeOff(form: FormData) {
  const date = str(form, "date");
  const reason = str(form, "reason");
  if (!date) return;
  await getSupabaseAdmin()
    .from("time_off")
    .upsert({ date, reason: reason || null }, { onConflict: "date" });
  revalidatePath("/admin");
}

export async function deleteTimeOff(form: FormData) {
  const id = str(form, "id");
  if (!id) return;
  await getSupabaseAdmin().from("time_off").delete().eq("id", id);
  revalidatePath("/admin");
}

export async function cancelBooking(form: FormData) {
  const id = str(form, "id");
  if (!id) return;
  // Отмена освобождает слот: status='cancelled' исключается из EXCLUDE-ограничения.
  await getSupabaseAdmin().from("bookings").update({ status: "cancelled" }).eq("id", id);
  revalidatePath("/admin");
}
