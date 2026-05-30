import { Client, Service } from "@/lib/types";

interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders: { useDefault: false; overrides: [{ method: "popup"; minutes: number }] };
}

interface CreateEventResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

// TODO: Configurar Google Cloud Console antes de usar:
// 1. console.cloud.google.com → Criar projecto
// 2. APIs & Services → Library → Activar "Google Calendar API"
// 3. APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web Application)
// 4. Definir VITE_GOOGLE_CLIENT_ID no Vercel e .env.local
// 5. Definir GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI no Vercel (server-side)
export function useGoogleCalendar() {
  const createEvent = async (
    appointment: { id: string; date: string; time: string; notes?: string },
    client: Client,
    service: Service,
    calendarId: string
  ): Promise<CreateEventResult> => {
    try {
      const [h, m] = appointment.time.split(":").map(Number);
      const start = new Date(`${appointment.date}T${appointment.time}:00`);
      const end = new Date(start.getTime() + service.duration_min * 60_000);

      const fmt = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+02:00`;
      };

      const event: CalendarEvent = {
        summary: `${service.name_pt} — ${client.name}`,
        description: [
          `Serviço: ${service.name_pt}`,
          `Cliente: ${client.name}`,
          `Tel: ${client.phone}`,
          appointment.notes ? `Nota: ${appointment.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: fmt(start), timeZone: "Europe/Madrid" },
        end: { dateTime: fmt(end), timeZone: "Europe/Madrid" },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }] },
      };

      const res = await fetch("/api/google-calendar/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, calendarId, appointmentId: appointment.id }),
      });

      return await res.json();
    } catch (err) {
      console.error("Google Calendar createEvent error:", err);
      return { success: false, error: String(err) };
    }
  };

  const deleteEvent = async (
    eventId: string,
    calendarId: string
  ): Promise<{ success: boolean }> => {
    try {
      const res = await fetch("/api/google-calendar/delete-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, calendarId }),
      });
      return await res.json();
    } catch (err) {
      console.error("Google Calendar deleteEvent error:", err);
      return { success: false };
    }
  };

  return { createEvent, deleteEvent };
}
