import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { formatSlotTime, formatDayLong } from "@/lib/time";
import type { ClaimedNotification } from "@/lib/types";

/**
 * Отправка напоминаний по каналам. Если ключи канала не заданы, сообщение
 * только логируется и считается «отправленным» — удобно для разработки, чтобы
 * проверять пайплайн без реальных Telegram/Resend.
 */

function buildMessage(n: ClaimedNotification, tz: string): { subject: string; text: string } {
  const day = formatDayLong(n.starts_at, tz);
  const time = formatSlotTime(n.starts_at, tz);
  const subject = `Напоминание о записи: ${n.service_name}`;
  const text =
    `Здравствуйте, ${n.client_name}!\n\n` +
    `Напоминаем о вашей записи «${n.service_name}».\n` +
    `Когда: ${day} в ${time} (${tz}).\n\n` +
    `До встречи!`;
  return { subject, text };
}

async function sendTelegram(chatId: string, text: string): Promise<void> {
  const token = env.telegramBotToken();
  if (!token) {
    console.log(`[notify:telegram:dev] -> ${chatId}\n${text}`);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body}`);
  }
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const key = env.resendApiKey();
  if (!key) {
    console.log(`[notify:email:dev] -> ${to}\n${subject}\n${text}`);
    return;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: env.emailFrom(),
    to,
    subject,
    text,
  });
  if (error) {
    throw new Error(`Resend: ${error.message}`);
  }
}

/** Отправляет одно напоминание. Бросает исключение при неудаче. */
export async function sendNotification(
  n: ClaimedNotification,
  tz: string
): Promise<void> {
  const { subject, text } = buildMessage(n, tz);
  if (n.channel === "telegram") {
    await sendTelegram(n.client_contact, text);
  } else {
    await sendEmail(n.client_contact, subject, text);
  }
}
