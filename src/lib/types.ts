export type Lang = "PT" | "ES";
export type AppointmentStatus = "agendada" | "confirmada" | "concluida" | "cancelada" | "reagendada" | "no_show";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  language: Lang;
  notes?: string;
  created_at: string;
  // Reputação (populados pelo useReputation)
  total_appointments?: number;
  total_cancellations?: number;
  total_no_shows?: number;
  total_spent?: number;
  reputation_score?: number;
  favorite_service_id?: string;
  last_visit?: string;
  visit_frequency_days?: number;
}

export interface Service {
  id: string;
  name_pt: string;
  name_es: string;
  category: string;
  price: number;
  duration_min: number;
  active: boolean;
  created_at?: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  service_id: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  reminder_sent: boolean;
  notes?: string;
  google_event_id?: string;
  created_at?: string;
}

export interface AppointmentRow extends Appointment {
  clients: { name: string; phone: string; language: Lang } | null;
  services: { name_pt: string; name_es: string; duration_min: number; price: number } | null;
}

export interface FinancialRecord {
  id: string;
  type: "income" | "expense";
  amount: number;
  description?: string;
  service_id?: string;
  appointment_id?: string;
  date: string;
  created_at?: string;
  services?: { name_pt: string } | null;
}

export interface WhatsappLog {
  id: string;
  client_id: string;
  appointment_id: string;
  phone: string;
  message: string;
  language: Lang;
  status: "enviado" | "falhou" | "pendente";
  twilio_sid?: string;
  sent_at: string;
  clients?: { name: string } | null;
}

export interface Settings {
  id?: string;
  studio_name: string;
  whatsapp_number: string;
  twilio_sid: string;
  twilio_token: string;
  reminder_time: string;
  google_calendar_id?: string;
  google_connected?: boolean;
  google_sync_enabled?: boolean;
  updated_at?: string;
}
