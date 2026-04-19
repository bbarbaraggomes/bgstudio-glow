export type Lang = "PT" | "ES";
export type AppointmentStatus = "agendada" | "confirmada" | "concluida" | "cancelada" | "reagendada";
export type PaymentMethod = "Dinheiro" | "Bizum" | "Cartão" | "Transferência";
export type ExpenseCategory = "Material" | "Aluguel" | "Marketing" | "Curso" | "Outro";

export interface Client {
  id: string;
  name: string;
  phone: string;
  countryCode: "+34" | "+55";
  email?: string;
  birthdate?: string;
  lang: Lang;
  notes?: string;
  photo?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
  active: boolean;
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number;
  status: AppointmentStatus;
  notes?: string;
  whatsappReminder: boolean;
  whatsappSent?: boolean;
  price: number;
  paymentMethod?: PaymentMethod;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  appointmentId?: string;
  serviceName?: string;
  category?: ExpenseCategory;
  description?: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  date: string;
  notes?: string;
}

export interface WhatsappLog {
  id: string;
  appointmentId: string;
  clientId: string;
  clientName: string;
  sentAt: string;
  status: "enviado" | "falhou" | "pendente";
  message: string;
}

export interface Settings {
  profile: { name: string; phone: string; email: string };
  workingHours: Record<string, { enabled: boolean; start: string; end: string }>;
  intervalBetween: 0 | 10 | 15 | 30;
  wassengerKey: string;
  defaultLang: Lang;
  remindersEnabled: boolean;
  reminderTime: string;
}
