import { useMemo } from "react";
import { Check, MessageCircle, Send, X } from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useWhatsappLogs } from "@/lib/hooks/useWhatsappLogs";
import { useStorage } from "@/lib/storage";
import { AppointmentRow, Lang } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/Avatar";
import { format, parseISO, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const buildMessage = (lang: Lang, name: string, time: string, service: string) => {
  if (lang === "PT") {
    return `Olá ${name}! 💅\n\nLembramos que amanhã você tem uma cita com Bárbara Gomes Beauty às ${time}.\nServiço: ${service}\n\n📍 Vigo, Galicia\n\nQualquer dúvida, estamos aqui!\n— Bárbara Gomes Beauty ✨`;
  }
  return `¡Hola ${name}! 💅\n\nTe recordamos que mañana tienes una cita con Bárbara Gomes Beauty a las ${time}.\nServicio: ${service}\n\n📍 Vigo, Galicia\n\n¡Cualquier duda, aquí estamos!\n— Bárbara Gomes Beauty ✨`;
};

const buildRecoveryMessage = (lang: Lang, name: string) => {
  if (lang === "PT") {
    return `Olá ${name}! 💕\n\nSentimos a sua falta na última cita! Gostaríamos de te ter de volta no nosso estúdio.\n\nQue tal agendar uma nova sessão? Temos horários disponíveis esta semana ✨\n\n📍 Vigo, Galicia\n— Bárbara Gomes Beauty`;
  }
  return `¡Hola ${name}! 💕\n\n¡Te echamos de menos en tu última cita! Nos encantaría verte de nuevo en nuestro estudio.\n\n¿Qué tal si agendas una nueva sesión? Tenemos horarios disponibles esta semana ✨\n\n📍 Vigo, Galicia\n— Bárbara Gomes Beauty`;
};

export default function WhatsappPage() {
  const { settings, loading, error } = useSettings();
  const { appointments } = useAppointments();
  const { logs, createLog } = useWhatsappLogs();
  const [remindersEnabled, setRemindersEnabled] = useStorage<boolean>("remindersEnabled", true);

  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const twoWeeksAgo = format(subDays(new Date(), 14), "yyyy-MM-dd");

  const upcoming = useMemo(
    () =>
      appointments.filter(
        (a) => a.date === tomorrow && a.reminder_sent && a.status !== "cancelada"
      ),
    [appointments, tomorrow]
  );

  const noShowRecent = useMemo(
    () =>
      appointments.filter(
        (a) => a.status === "no_show" && a.date >= twoWeeksAgo
      ),
    [appointments, twoWeeksAgo]
  );

  const sendNow = async (a: AppointmentRow) => {
    if (!a.clients || !a.services) return;
    const lang = a.clients.language as Lang;
    const msg = buildMessage(lang, a.clients.name.split(" ")[0], a.time, a.services.name_pt);
    const status = settings?.twilio_sid ? "enviado" : "pendente";
    const ok = await createLog({
      client_id: a.client_id,
      appointment_id: a.id,
      phone: a.clients.phone,
      message: msg,
      language: lang,
      status,
    });
    if (ok) {
      if (!settings?.twilio_sid) {
        toast.warning("Twilio não configurado · simulação salva no log");
      } else {
        toast.success(`Lembrete enviado para ${a.clients.name}`);
      }
    }
  };

  const sendRecovery = async (a: AppointmentRow) => {
    if (!a.clients) return;
    const lang = a.clients.language as Lang;
    const msg = buildRecoveryMessage(lang, a.clients.name.split(" ")[0]);
    const status = settings?.twilio_sid ? "enviado" : "pendente";
    const ok = await createLog({
      client_id: a.client_id,
      appointment_id: a.id,
      phone: a.clients.phone,
      message: msg,
      language: lang,
      status,
    });
    if (ok) {
      if (!settings?.twilio_sid) {
        toast.warning("Twilio não configurado · mensagem salva no log");
      } else {
        toast.success(`Mensagem de recuperação enviada para ${a.clients.name}`);
      }
    }
  };

  const connected = !!settings?.twilio_sid;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground animate-pulse">A carregar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">WhatsApp · Twilio</p>
          <h1 className="text-display text-3xl md:text-4xl mt-1">Lembretes automáticos</h1>
        </div>
        <div className={`px-4 py-2 rounded-xl border text-sm flex items-center gap-2 ${connected ? "bg-success/10 border-success/30 text-[hsl(var(--success))]" : "bg-warning/10 border-warning/30 text-[hsl(var(--warning))]"}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-warning"} animate-pulse`} />
          {connected ? "Twilio conectado" : "Configure as credenciais Twilio em Configurações"}
        </div>
      </header>

      <section className="card-luxury p-5 flex items-center justify-between">
        <div>
          <p className="font-medium">Envio automático</p>
          <p className="text-xs text-muted-foreground">24h antes da cita · disparo às {settings?.reminder_time || "10:00"}</p>
        </div>
        <Switch
          checked={remindersEnabled}
          onCheckedChange={setRemindersEnabled}
        />
      </section>

      <section className="card-luxury p-5">
        <h3 className="text-display text-xl mb-4">Lembretes para amanhã ({format(addDays(new Date(), 1), "dd/MM", { locale: ptBR })})</h3>
        {upcoming.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma cita com lembrete agendado</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li key={a.id} className="flex items-center gap-4 p-3 rounded-xl border border-[hsl(var(--border))]">
                <Avatar name={a.clients?.name || "?"} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{a.clients?.name} <span className="text-xs text-muted-foreground">· {a.clients?.language}</span></p>
                  <p className="text-xs text-muted-foreground truncate">{a.time} · {a.services?.name_pt}</p>
                </div>
                <Button size="sm" onClick={() => sendNow(a)} className="rounded-lg"><Send className="h-3.5 w-3.5" /> Enviar agora</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-luxury p-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-display text-xl">Mensagens de recuperação</h3>
          {noShowRecent.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30 font-medium">
              {noShowRecent.length}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">Clientes que faltaram sem avisar nos últimos 14 dias</p>
        {noShowRecent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma falta recente 🎉</p>
        ) : (
          <ul className="space-y-2">
            {noShowRecent.map((a) => (
              <li key={a.id} className="flex items-center gap-4 p-3 rounded-xl border border-destructive/20 bg-destructive/5">
                <Avatar name={a.clients?.name || "?"} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{a.clients?.name} <span className="text-xs text-muted-foreground">· {a.clients?.language}</span></p>
                  <p className="text-xs text-muted-foreground truncate">
                    Faltou em {format(parseISO(a.date), "dd/MM", { locale: ptBR })} · {a.services?.name_pt}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendRecovery(a)}
                  className="rounded-lg border-destructive/40 text-destructive hover:bg-destructive/5"
                >
                  <Send className="h-3.5 w-3.5" /> Enviar lembrete
                </Button>
              </li>
            ))}
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
                  <p className="text-sm font-medium truncate">{l.clients?.name || l.phone}</p>
                  <p className="text-[11px] text-muted-foreground">{format(parseISO(l.sent_at), "dd/MM/yyyy 'às' HH:mm")}</p>
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
