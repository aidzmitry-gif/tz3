export type Service = {
  id: string;
  name: string;
  duration_min: number;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type WorkingHour = {
  id: string;
  weekday: number; // 0 = Sunday ... 6 = Saturday
  start_time: string; // 'HH:MM:SS'
  end_time: string;
};

export type TimeOff = {
  id: string;
  date: string; // 'YYYY-MM-DD'
  reason: string | null;
};

export type BookingStatus = "confirmed" | "cancelled" | "completed";

export type Booking = {
  id: string;
  service_id: string;
  client_name: string;
  client_contact: string;
  starts_at: string; // ISO (UTC)
  ends_at: string;
  status: BookingStatus;
  created_at: string;
};

export type NotificationChannel = "telegram" | "email";
export type NotificationStatus = "pending" | "sending" | "sent" | "failed";

export type Slot = {
  starts_at: string; // ISO (UTC)
  ends_at: string;
};

/** Строка, возвращаемая RPC claim_due_notifications */
export type ClaimedNotification = {
  notification_id: string;
  channel: NotificationChannel;
  client_name: string;
  client_contact: string;
  service_name: string;
  starts_at: string;
};
