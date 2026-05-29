import { useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useClients } from "@/lib/hooks/useClients";
import { useServices } from "@/lib/hooks/useServices";
import { useFinancial } from "@/lib/hooks/useFinancial";
import { Appointment, AppointmentRow, AppointmentStatus, Client, Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { eur } from "@/lib/format";
import { toast } from "sonner";

type View = "month" | "week" | "day";

export default function AgendaPage() {
  const { appointments, loading, error, createAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const { clients } = useClients();
  const { activeServices: services } = useServices();
  const { createRecord } = useFinancial();

  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);
  const [presetDate, setPresetDate] = useState<string | null>(null);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfMonth(cursor);
    const days: Date[] = [];
    let d = start;
    while (d <= end || days.length % 7 !== 0) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const s = startOfWeek(cursor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [cursor]);

  const aptsByDay = (d: Date) =>
    appointments
      .filter((a) => a.date === format(d, "yyyy-MM-dd"))
      .sort((a, b) => a.time.localeCompare(b.time));

  const openNew = (date?: Date) => {
    setEditing(null);
    setPresetDate(date ? format(date, "yyyy-MM-dd") : null);
    setOpen(true);
  };

  const openEdit = (a: AppointmentRow) => {
    setEditing(a);
    setPresetDate(null);
    setOpen(true);
  };

  const saveApt = async (data: Partial<Appointment>) => {
    if (editing) {
      const ok = await updateAppointment(editing.id, data);
      if (ok) toast.success("Cita atualizada");
    } else {
      const ok = await createAppointment({
        client_id: data.client_id!,
        service_id: data.service_id!,
        date: data.date!,
        time: data.time!,
        status: "agendada",
        reminder_sent: data.reminder_sent ?? true,
        notes: data.notes,
      });
      if (ok) toast.success("Cita criada com sucesso ✨");
    }
    setOpen(false);
  };

  const setStatus = async (a: AppointmentRow, status: AppointmentStatus) => {
    await updateAppointment(a.id, { status });
    if (status === "concluida") {
      await createRecord({
        type: "income",
        amount: a.services?.price || 0,
        description: a.services?.name_pt || "Serviço",
        service_id: a.service_id,
        appointment_id: a.id,
        date: a.date,
      });
      toast.success("Cita concluída · lançamento criado");
    } else {
      toast.success("Status atualizado");
    }
  };

  const removeApt = async (a: AppointmentRow) => {
    const ok = await deleteAppointment(a.id);
    if (ok) {
      setOpen(false);
      toast.success("Cita removida");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground animate-pulse">A carregar agenda...</p>
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
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Agenda</p>
          <h1 className="text-display text-3xl md:text-4xl mt-1 capitalize">
            {format(cursor, "MMMM yyyy", { locale: ptBR })}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-card border border-[hsl(var(--border))] rounded-xl p-1">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all capitalize ${
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => setCursor(view === "month" ? subMonths(cursor, 1) : addDays(cursor, view === "week" ? -7 : -1))} className="rounded-xl">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCursor(new Date())} className="rounded-xl text-xs">Hoje</Button>
            <Button size="icon" variant="outline" onClick={() => setCursor(view === "month" ? addMonths(cursor, 1) : addDays(cursor, view === "week" ? 7 : 1))} className="rounded-xl">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => openNew()} className="rounded-xl"><Plus className="h-4 w-4" /> Nova cita</Button>
        </div>
      </header>

      {view === "month" && (
        <div className="card-luxury p-3 md:p-5">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <div key={d} className="text-[11px] uppercase tracking-wider text-muted-foreground text-center py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((d) => {
              const apts = aptsByDay(d);
              const inMonth = isSameMonth(d, cursor);
              const today = isSameDay(d, new Date());
              return (
                <button
                  key={d.toString()}
                  onClick={() => openNew(d)}
                  className={`min-h-[88px] md:min-h-[110px] p-1.5 rounded-xl text-left border transition-all ${
                    inMonth ? "bg-card hover:border-primary/40" : "bg-muted/30 opacity-60"
                  } ${today ? "border-primary shadow-gold" : "border-[hsl(var(--border))]"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${today ? "text-primary" : ""}`}>{format(d, "d")}</span>
                    {apts.length > 0 && <span className="text-[10px] text-primary">{apts.length}</span>}
                  </div>
                  <div className="space-y-0.5">
                    {apts.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-foreground truncate"
                      >
                        {a.time} {a.clients?.name?.split(" ")[0]}
                      </div>
                    ))}
                    {apts.length > 2 && <div className="text-[10px] text-muted-foreground">+{apts.length - 2}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="card-luxury p-3 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((d) => {
              const apts = aptsByDay(d);
              const today = isSameDay(d, new Date());
              return (
                <div key={d.toString()} className={`rounded-xl border p-3 ${today ? "border-primary" : "border-[hsl(var(--border))]"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{format(d, "EEE", { locale: ptBR })}</p>
                    <p className={`text-display text-lg ${today ? "text-primary" : ""}`}>{format(d, "d")}</p>
                  </div>
                  <div className="space-y-1.5 min-h-[40px]">
                    {apts.length === 0 && <button onClick={() => openNew(d)} className="text-[11px] text-muted-foreground hover:text-primary">+ Adicionar</button>}
                    {apts.map((a) => (
                      <button key={a.id} onClick={() => openEdit(a)} className="w-full text-left p-2 rounded-lg bg-secondary/60 hover:bg-secondary transition-colors">
                        <p className="text-xs font-medium">{a.time} · {a.clients?.name?.split(" ")[0]}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{a.services?.name_pt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "day" && (
        <div className="card-luxury p-5 md:p-7">
          <h3 className="text-display text-xl mb-4 capitalize">{format(cursor, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h3>
          {aptsByDay(cursor).length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-sm mb-3">Nenhuma cita neste dia</p>
              <Button onClick={() => openNew(cursor)} variant="outline" className="rounded-xl"><Plus className="h-4 w-4" /> Criar cita</Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {aptsByDay(cursor).map((a) => (
                <li key={a.id} className="flex items-center gap-4 p-4 rounded-xl border border-[hsl(var(--border))] hover:border-primary/40 transition-colors">
                  <div className="text-center w-16 shrink-0">
                    <p className="text-display text-2xl leading-none">{a.time}</p>
                    <p className="text-[10px] uppercase text-muted-foreground mt-1">{a.services?.duration_min}min</p>
                  </div>
                  <Avatar name={a.clients?.name || "?"} size={42} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{a.clients?.name}</p>
                    <p className="text-xs text-muted-foreground">{a.services?.name_pt} · {eur(a.services?.price || 0)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                  <Button variant="outline" size="sm" onClick={() => openEdit(a)} className="rounded-lg">Editar</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <AppointmentDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        presetDate={presetDate}
        clients={clients}
        services={services}
        onSave={saveApt}
        onDelete={removeApt}
        onStatus={setStatus}
      />
    </div>
  );
}

function AppointmentDialog({
  open, onOpenChange, editing, presetDate, clients, services, onSave, onDelete, onStatus,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AppointmentRow | null;
  presetDate: string | null;
  clients: Client[];
  services: Service[];
  onSave: (data: Partial<Appointment>) => void;
  onDelete: (a: AppointmentRow) => void;
  onStatus: (a: AppointmentRow, s: AppointmentStatus) => void;
}) {
  const [client_id, setClientId] = useState("");
  const [service_id, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [reminder, setReminder] = useState(true);

  useMemo(() => {
    if (open) {
      if (editing) {
        setClientId(editing.client_id);
        setServiceId(editing.service_id);
        setDate(editing.date);
        setTime(editing.time);
        setNotes(editing.notes || "");
        setReminder(editing.reminder_sent);
      } else {
        setClientId("");
        setServiceId("");
        setDate(presetDate || format(new Date(), "yyyy-MM-dd"));
        setTime("10:00");
        setNotes("");
        setReminder(true);
      }
    }
  }, [open]);

  const submit = () => {
    if (!client_id || !service_id || !date || !time) {
      toast.error("Preencha cliente, serviço, data e horário");
      return;
    }
    onSave({ client_id, service_id, date, time, notes, reminder_sent: reminder });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{editing ? "Editar cita" : "Nova cita"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Cliente</Label>
            <Select value={client_id} onValueChange={setClientId}>
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} · {c.phone}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Serviço</Label>
            <Select value={service_id} onValueChange={setServiceId}>
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Selecionar serviço" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name_pt} · {s.duration_min}min · {eur(s.price)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg" />
            </div>
            <div>
              <Label>Horário</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg" />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-lg" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <Label className="cursor-pointer">Lembrete WhatsApp 24h antes</Label>
              <p className="text-[11px] text-muted-foreground">Enviado automaticamente via Twilio</p>
            </div>
            <Switch checked={reminder} onCheckedChange={setReminder} />
          </div>

          {editing && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[hsl(var(--border-solid))]">
              {(["confirmada", "concluida", "cancelada", "reagendada"] as AppointmentStatus[]).map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => onStatus(editing, s)} className="rounded-lg text-xs capitalize">
                  {s}
                </Button>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-2">
            {editing ? (
              <Button variant="ghost" onClick={() => onDelete(editing)} className="text-destructive hover:text-destructive">Excluir</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancelar</Button>
              <Button onClick={submit} className="rounded-lg">{editing ? "Salvar" : "Criar cita"}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
