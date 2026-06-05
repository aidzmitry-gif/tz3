import "server-only";

/**
 * Доступ к переменным окружения с понятной ошибкой, если что-то не задано.
 * Импортируется только на сервере (server-only), чтобы service_role ключ
 * никогда не попал в браузерный бандл.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Не задана переменная окружения ${name}. Скопируйте .env.example в .env.local и заполните.`
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),

  /** Бизнес-зона: рабочие часы заданы в этом времени. */
  businessTimezone: () => optional("BUSINESS_TIMEZONE", "Europe/Moscow"),

  /** Секрет для защиты cron-эндпойнта отправки напоминаний. */
  cronSecret: () => required("CRON_SECRET"),

  // Каналы уведомлений (опциональны — если не заданы, соответствующий канал
  // просто логируется и помечается отправленным в dev-режиме).
  telegramBotToken: () => process.env.TELEGRAM_BOT_TOKEN || "",
  resendApiKey: () => process.env.RESEND_API_KEY || "",
  emailFrom: () => optional("EMAIL_FROM", "Запись <onboarding@resend.dev>"),
};
