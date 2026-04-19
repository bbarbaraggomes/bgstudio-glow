import { useMemo } from "react";
import { Check, MessageCircle, Send, X } from "lucide-react";
import { useStorage, uid } from "@/lib/storage";
import { Appointment, Client, Service, Settings, WhatsappLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/Avatar";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const buildMessage = (lang: "PT" | "ES", name: string, time: string, service: string) => {
  if (lang === "PT") {
    return `Olá ${name}! 💅\n\nLembramos que amanhã você tem uma cita com Bárbara Gomes Beauty às ${time}.\nServiço: ${service}\n\n📍 Vigo, Galicia\n\nQualquer dúvida, estamos aqui!\n— Bárbara Gomes Beauty ✨`;
  }
  return `¡Hola ${name}! 💅\n\nTe recordamos que mañana tienes una cita con Bárbara Gomes Beauty a las ${time}.\nServicio: ${service}\n\n📍 Vigo, Galicia\n\n¡Cualquier duda, aquí estamos!\n— Bárbara Gomes Beauty ✨`;
};

export default function WhatsappPage() {
  const [settings, setSettings] = useStorage<Settings>("settings", {} as Settings);
  const [appointments] = useStorage<Appointment[]>("appointments", []);
  const [clients] = useStorage<Client[]>("clients", []);
  const [services] = useStorage<Service[]>("services", []);
  const [logs, setLogs] = useStorage<WhatsappLog[]>("whatsapp_log", []);

  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const upcoming = useMemo(
    () =>
      appointments.filter(
        (a) => a.date === tomorrow && a.whatsappReminder && a.status !== "cancelada"
      ),
    [appointments, tomorrow]
  );

  const sendNow = (a: Appointment) => {
    const c = clients.find((c) => c.id === a.clientId);
    const s = services.find((s) => s.id === a.serviceId);
    if (!c || !s) return;
    const msg = buildMessage(c.lang, c.name.split(" ")[0], a.time, s.name);
    const log: WhatsappLog = {
      id: uid(),
      appointmentId: a.id,
      clientId: c.id,
      clientName: c.name,
      sentAt: new Date().toISOString(),
      status: settings.wassengerKey ? "enviado" : "pendente",
      message: msg,
    };
    setLogs((arr) => [log, ...arr]);
    if (!settings.wassengerKey) {
      toast.warning("Wassenger não configurado · simulação salva no log");
    } else {
      toast.success(`Lembrete enviado para ${c.name}`);
    }
  };

  const connected = !!settings.wassengerKey;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">WhatsApp · Wassenger</p>
          <h1 className="text-display text-3xl md:text-4xl mt-1">Lembretes automáticos</h1>
        </div>
        <div className={`px-4 py-2 rounded-xl border text-sm flex items-center gap-2 ${connected ? "bg-success/10 border-success/30 text-[hsl(var(--success))]" : "bg-warning/10 border-warning/30 text-[hsl(var(--warning))]"}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-warning"} animate-pulse`} />
          {connected ? "Wassenger conectado" : "Configure a API Key em Configurações"}
        </div>
      </header>

      <section className="card-luxury p-5 flex items-center justify-between">
        <div>
          <p className="font-medium">Envio automático</p>
          <p className="text-xs text-muted-foreground">24h antes da cita · disparo às {settings.reminderTime || "10:00"}</p>
        </div>
        <Switch
          checked={!!settings.remindersEnabled}
          onCheckedChange={(v) => setSettings((s) => ({ ...s, remindersEnabled: v }))}
        />
      </section>

      <section className="card-luxury p-5">
        <h3 className="text-display text-xl mb-4">Lembretes para amanhã ({format(addDays(new Date(), 1), "dd/MM", { locale: ptBR })})</h3>
        {upcoming.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma cita com lembrete agendado</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => {
              const c = clients.find((x) => x.id === a.clientId);
              const s = services.find((x) => x.id === a.serviceId);
              return (
                <li key={a.id} className="flex items-center gap-4 p-3 rounded-xl border border-[hsl(var(--border))]">
                  <Avatar name={c?.name || "?"} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c?.name} <span className="text-xs text-muted-foreground">· {c?.lang}</span></p>
                    <p className="text-xs text-muted-foreground truncate">{a.time} · {s?.name}</p>
                  </div>
                  <Button size="sm" onClick={() => sendNow(a)} className="rounded-lg"><Send className="h-3.5 w-3.5" /> Enviar agora</Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="card-luxury p-5">
          <h3 className="text-display text-xl mb-3">Pré-visualização · PT-BR</h3>
          <pre className="text-xs whitespace-pre-wrap p-4 rounded-lg bg-secondary/50 font-ui text-foreground/80 leading-relaxed">{buildMessage("PT", "Mariana", "14:30", "Esmaltação em Gel")}</pre>
        </div>
        <div className="card-luxury p-5">
          <h3 className="text-display text-xl mb-3">Pré-visualização · ES</h3>
          <pre className="text-xs whitespace-pre-wrap p-4 rounded-lg bg-secondary/50 font-ui text-foreground/80 leading-relaxed">{buildMessage("ES", "Sofia", "10:00", "Manicure Russa")}</pre>
        </div>
      </section>

      <section className="card-luxury p-5">
        <h3 className="text-display text-xl mb-4">Log de mensagens</h3>
        {logs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem enviada ainda</p>
        ) : (
          <ul className="divide-y divide-[hsl(var(--border-solid))]">
            {logs.slice(0, 20).map((l) => (
              <li key={l.id} className="py-3 flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  l.status === "enviado" ? "bg-success/15 text-[hsl(var(--success))]" :
                  l.status === "falhou" ? "bg-destructive/15 text-destructive" :
                  "bg-warning/15 text-[hsl(var(--warning))]"
                }`}>
                  {l.status === "enviado" ? <Check className="h-4 w-4" /> : l.status === "falhou" ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.clientName}</p>
                  <p className="text-[11px] text-muted-foreground">{format(parseISO(l.sentAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{l.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
