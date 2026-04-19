import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, MessageCircle, Plus, TrendingUp, UserPlus, Wallet } from "lucide-react";
import { format, isToday, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStorage } from "@/lib/storage";
import { Appointment, Client, Service, Transaction, WhatsappLog } from "@/lib/types";
import { eur } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";

export default function DashboardPage() {
  const [appointments] = useStorage<Appointment[]>("appointments", []);
  const [clients] = useStorage<Client[]>("clients", []);
  const [services] = useStorage<Service[]>("services", []);
  const [transactions] = useStorage<Transaction[]>("transactions", []);
  const [logs] = useStorage<WhatsappLog[]>("whatsapp_log", []);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayApts = useMemo(
    () => appointments.filter((a) => a.date === todayStr).sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, todayStr]
  );
  const todayRevenue = transactions
    .filter((t) => t.type === "income" && t.date === todayStr)
    .reduce((s, t) => s + t.amount, 0);
  const remindersToday = logs.filter((l) => l.sentAt.startsWith(todayStr)).length;
  const next = todayApts.find((a) => a.status !== "concluida" && a.status !== "cancelada");

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayBusy = (d: Date) =>
    appointments.filter((a) => a.date === format(d, "yyyy-MM-dd") && a.status !== "cancelada").length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 19) return "Boa tarde";
    return "Boa noite";
  };

  const cards = [
    { label: "Citas hoje", value: todayApts.length, icon: Calendar, accent: "text-primary" },
    { label: "Faturamento hoje", value: eur(todayRevenue), icon: Wallet, accent: "text-[hsl(var(--success))]" },
    {
      label: "Próxima cita",
      value: next ? `${next.time}` : "—",
      sub: next ? clients.find((c) => c.id === next.clientId)?.name : "Sem citas",
      icon: TrendingUp,
      accent: "text-[hsl(var(--warning))]",
    },
    { label: "Lembretes WhatsApp", value: remindersToday, icon: MessageCircle, accent: "text-[hsl(var(--success))]" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          <h1 className="text-display text-3xl md:text-4xl mt-1">
            {greeting()}, Bárbara <span className="inline-block animate-fade-in">👋</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/agenda"><Button className="rounded-xl"><Plus className="h-4 w-4" /> Nova cita</Button></Link>
          <Link to="/clientes"><Button variant="outline" className="rounded-xl border-primary/40 text-primary hover:bg-primary/5"><UserPlus className="h-4 w-4" /> Cliente</Button></Link>
          <Link to="/financeiro"><Button variant="outline" className="rounded-xl border-primary/40 text-primary hover:bg-primary/5"><Wallet className="h-4 w-4" /> Lançamento</Button></Link>
        </div>
      </header>

      {/* Summary cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card-luxury p-5 hover:shadow-card transition-shadow">
            <div className="flex items-start justify-between">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{c.label}</p>
              <c.icon className={`h-4 w-4 ${c.accent}`} />
            </div>
            <p className="text-display text-3xl mt-3">{c.value}</p>
            {c.sub && <p className="text-xs text-muted-foreground mt-1 truncate">{c.sub}</p>}
          </div>
        ))}
      </section>

      {/* Week + Today list */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="card-luxury p-6 lg:col-span-1">
          <h2 className="text-display text-xl mb-4">Sua semana</h2>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const busy = dayBusy(d);
              const today = isToday(d);
              return (
                <div
                  key={d.toString()}
                  className={`flex flex-col items-center justify-center aspect-square rounded-xl border text-center transition-all ${
                    today ? "bg-primary text-primary-foreground border-primary shadow-gold" : "border-[hsl(var(--border))] hover:border-primary/40"
                  }`}
                >
                  <span className="text-[10px] uppercase opacity-70">{format(d, "EEEEEE", { locale: ptBR })}</span>
                  <span className="text-lg font-medium leading-none mt-1">{format(d, "d")}</span>
                  {busy > 0 && (
                    <span className={`mt-1 text-[10px] ${today ? "text-primary-foreground/90" : "text-primary"}`}>● {busy}</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4">● indica número de citas no dia</p>
        </div>

        <div className="card-luxury p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-display text-xl">Agenda de hoje</h2>
            <Link to="/agenda" className="text-xs text-primary hover:underline">Ver tudo →</Link>
          </div>
          {todayApts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto opacity-40 mb-2" />
              <p className="text-sm">Nenhuma cita hoje. Aproveite o dia ✨</p>
            </div>
          ) : (
            <ul className="divide-y divide-[hsl(var(--border-solid))]">
              {todayApts.map((a) => {
                const c = clients.find((c) => c.id === a.clientId);
                const s = services.find((s) => s.id === a.serviceId);
                return (
                  <li key={a.id} className="py-3 flex items-center gap-4">
                    <div className="text-center w-14 shrink-0">
                      <p className="text-display text-lg leading-none">{a.time}</p>
                      <p className="text-[10px] text-muted-foreground uppercase mt-1">{a.duration}min</p>
                    </div>
                    <Avatar name={c?.name || "?"} size={38} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s?.name}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
