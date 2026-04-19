import { Appointment, Client, Service, Settings, Transaction, WhatsappLog } from "./types";
import { loadStorage, saveStorage, uid } from "./storage";
import { addDays, format } from "date-fns";

const SEED_FLAG = "seeded_v1";

const today = new Date();
const fmt = (d: Date) => format(d, "yyyy-MM-dd");

export function seedIfEmpty() {
  if (loadStorage(SEED_FLAG, false)) return;

  const services: Service[] = [
    { id: uid(), name: "Manicure Clássica", duration: 45, price: 25, active: true },
    { id: uid(), name: "Manicure Russa", duration: 75, price: 45, active: true },
    { id: uid(), name: "Pedicure Spa", duration: 60, price: 35, active: true },
    { id: uid(), name: "Esmaltação em Gel", duration: 60, price: 40, active: true },
    { id: uid(), name: "Nail Art Premium", duration: 90, price: 60, active: true },
  ];

  const clients: Client[] = [
    { id: uid(), name: "Sofia Martínez", phone: "698108173", countryCode: "+34", lang: "ES", email: "sofia@mail.com", notes: "Prefere tons nude", createdAt: new Date().toISOString() },
    { id: uid(), name: "Mariana Silva", phone: "11987654321", countryCode: "+55", lang: "PT", email: "mariana@mail.com", notes: "Alergia a acetona", createdAt: new Date().toISOString() },
    { id: uid(), name: "Lucía García", phone: "612345678", countryCode: "+34", lang: "ES", createdAt: new Date().toISOString() },
  ];

  const appointments: Appointment[] = [
    { id: uid(), clientId: clients[0].id, serviceId: services[1].id, date: fmt(today), time: "10:00", duration: 75, status: "confirmada", whatsappReminder: true, price: 45 },
    { id: uid(), clientId: clients[1].id, serviceId: services[3].id, date: fmt(today), time: "14:30", duration: 60, status: "agendada", whatsappReminder: true, price: 40 },
    { id: uid(), clientId: clients[2].id, serviceId: services[0].id, date: fmt(addDays(today, 1)), time: "11:00", duration: 45, status: "confirmada", whatsappReminder: true, price: 25 },
    { id: uid(), clientId: clients[0].id, serviceId: services[4].id, date: fmt(addDays(today, 2)), time: "16:00", duration: 90, status: "agendada", whatsappReminder: true, price: 60 },
    { id: uid(), clientId: clients[1].id, serviceId: services[2].id, date: fmt(addDays(today, -3)), time: "09:30", duration: 60, status: "concluida", whatsappReminder: false, price: 35, paymentMethod: "Bizum" },
  ];

  const transactions: Transaction[] = [
    { id: uid(), type: "income", appointmentId: appointments[4].id, serviceName: "Pedicure Spa", amount: 35, paymentMethod: "Bizum", date: fmt(addDays(today, -3)) },
    { id: uid(), type: "income", serviceName: "Manicure Clássica", amount: 25, paymentMethod: "Dinheiro", date: fmt(addDays(today, -5)) },
    { id: uid(), type: "income", serviceName: "Esmaltação em Gel", amount: 40, paymentMethod: "Cartão", date: fmt(addDays(today, -7)) },
    { id: uid(), type: "income", serviceName: "Manicure Russa", amount: 45, paymentMethod: "Bizum", date: fmt(addDays(today, -10)) },
    { id: uid(), type: "income", serviceName: "Nail Art Premium", amount: 60, paymentMethod: "Cartão", date: fmt(addDays(today, -12)) },
    { id: uid(), type: "income", serviceName: "Pedicure Spa", amount: 35, paymentMethod: "Dinheiro", date: fmt(addDays(today, -15)) },
    { id: uid(), type: "expense", category: "Material", description: "Esmaltes OPI", amount: 120, date: fmt(addDays(today, -8)) },
    { id: uid(), type: "expense", category: "Aluguel", description: "Aluguel mensal estúdio", amount: 450, date: fmt(addDays(today, -20)) },
    { id: uid(), type: "expense", category: "Marketing", description: "Anúncios Instagram", amount: 80, date: fmt(addDays(today, -6)) },
    { id: uid(), type: "expense", category: "Material", description: "Limas e algodão", amount: 35, date: fmt(addDays(today, -2)) },
  ];

  const settings: Settings = {
    profile: { name: "Bárbara Gomes", phone: "+34698108173", email: "barbara@bgbeauty.com" },
    workingHours: {
      monday: { enabled: true, start: "09:00", end: "19:00" },
      tuesday: { enabled: true, start: "09:00", end: "19:00" },
      wednesday: { enabled: true, start: "09:00", end: "19:00" },
      thursday: { enabled: true, start: "09:00", end: "19:00" },
      friday: { enabled: true, start: "09:00", end: "19:00" },
      saturday: { enabled: true, start: "10:00", end: "16:00" },
      sunday: { enabled: false, start: "10:00", end: "14:00" },
    },
    intervalBetween: 15,
    wassengerKey: "",
    defaultLang: "PT",
    remindersEnabled: true,
    reminderTime: "10:00",
  };

  const logs: WhatsappLog[] = [
    { id: uid(), appointmentId: appointments[0].id, clientId: clients[0].id, clientName: clients[0].name, sentAt: new Date().toISOString(), status: "enviado", message: "Recordatorio enviado" },
  ];

  saveStorage("clients", clients);
  saveStorage("services", services);
  saveStorage("appointments", appointments);
  saveStorage("transactions", transactions);
  saveStorage("settings", settings);
  saveStorage("whatsapp_log", logs);
  saveStorage(SEED_FLAG, true);
}
