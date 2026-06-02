import { useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useClients } from "@/lib/hooks/useClients";
import { useServices } from "@/lib/hooks/useServices";
import { useFinancial } from "@/lib/hooks/useFinancial";
import { useSettings } from "@/lib/hooks/useSettings";
import { useGoogleCalendar } from "@/lib/hooks/useGoogleCalendar";
import { useReputation } from "@/lib/hooks/useReputation";
import { useAppointmentServices } from "@/lib/hooks/useAppointmentServices";
import { Appointment, AppointmentRow, AppointmentStatus, Client, Lang, Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Avatar";
import { ClientSearchCombobox } from "@/components/ClientSearchCombobox";
import { eur } from "@/lib/format";
import { toast } from "sonner";

type View = "month" | "week" | "day";
interface SelectedService { service_id: string; price: number; }
interface ExtraItem { description: string; price: number; }

const aptServiceLabel = (a: AppointmentRow): string => {
  const list = a.appointment_services;
  if (list && list.length > 0) {
    const names = list.map((s) => s.services?.name_pt).filter(Boolean) as string[];
    if (names.length <= 2) return names.join(" + ");
    return `${names[0]} + ${names.length - 1} mais`;
  }
  return a.services?.name_pt || "—";
};

const aptTotal = (a: AppointmentRow) => a.total_price ?? a.services?.price ?? 0;

export default function AgendaPage() {
  const { appointments, loading, error, fetchAppointments, createAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const { clients, fetchClients, createClient } = useClients();
  const { activeServices: services } = useServices();
  const { createRecord } = useFinancial();
  const { settings } = useSettings();
  const { createEvent, deleteEvent } = useGoogleCalendar();
  const { updateClientReputation } = useReputation();
  const { saveAppointmentServices, saveAppointmentExtras } = useAppointmentServices();

  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);
  const [presetDate, setPresetDate] = useState<string | null>(null);
  const [cancelModalApt, setCancelModalApt] = useState<AppointmentRow | null>(null);

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

  const saveApt = async (
    data: Partial<Appointment>,
    selectedSvcs: SelectedService[],
    extraItems: ExtraItem[]
  ) => {
    const firstServiceId = selectedSvcs[0]?.service_id ?? "";

    if (editing) {
      const ok = await updateAppointment(editing.id, { ...data, service_id: firstServiceId });
      if (ok) {
        await saveAppointmentServices(editing.id, selectedSvcs);
        await saveAppointmentExtras(editing.id, extraItems);
        await fetchAppointments();
        toast.success("Cita atualizada");
      }
    } else {
      const newId = await createAppointment({
        client_id: data.client_id!,
        service_id: firstServiceId,
        date: data.date!,
        time: data.time!,
        status: "agendada",
        reminder_sent: data.reminder_sent ?? true,
        notes: data.notes,
        total_price: data.total_price,
      });
      if (newId) {
        await saveAppointmentServices(newId, selectedSvcs);
        await saveAppointmentExtras(newId, extraItems);
        await fetchAppointments();

        if (settings?.google_sync_enabled && settings?.google_calendar_id) {
          const client = clients.find((c) => c.id === data.client_id);
          const mainService = services.find((s) => s.id === firstServiceId);
          if (client && mainService) {
            const result = await createEvent(
              { id: newId, date: data.date!, time: data.time!, notes: data.notes },
              client,
              mainService,
              settings.google_calendar_id
            );
            if (result.success && result.eventId) {
              await updateAppointment(newId, { google_event_id: result.eventId });
              toast.success("Cita criada e adicionada ao Google Calendar ✓");
            } else {
              toast.warning("Cita criada. Erro ao sincronizar com Google Calendar.");
            }
          } else {
            toast.success("Cita criada com sucesso ✨");
          }
        } else {
          toast.success("Cita criada com sucesso ✨");
        }
      }
    }
    setOpen(false);
  };

  const setStatus = async (a: AppointmentRow, status: AppointmentStatus) => {
    if (status === "cancelada") {
      setOpen(false);
      setCancelModalApt(a);
      return;
    }
    await updateAppointment(a.id, { status });
    if (status === "concluida") {
      const aptSvcs = a.appointment_services;
      const description =
        aptSvcs && aptSvcs.length > 0
          ? aptSvcs.map((s) => s.services?.name_pt).filter(Boolean).join(" + ")
          : a.services?.name_pt || "Serviço";
      const amount = aptTotal(a);

      await createRecord({
        type: "income",
        amount,
        description,
        service_id: a.service_id,
        appointment_id: a.id,
        date: a.date,
      });
      await updateClientReputation(a.client_id);
      await fetchClients();
      toast.success("Cita concluída · lançamento criado");
    } else {
      toast.success("Status atualizado");
    }
  };

  const handleCancelReason = async (a: AppointmentRow, withNotice: boolean) => {
    const status: AppointmentStatus = withNotice ? "cancelada" : "no_show";
    await updateAppointment(a.id, { status });
    await updateClientReputation(a.client_id);
    await fetchClients();
    setCancelModalApt(null);
    toast.success(withNotice ? "Cita cancelada com aviso" : "Marcada como faltou sem avisar");
  };

  const removeApt = async (a: AppointmentRow) => {
    if (a.google_event_id && settings?.google_connected && settings?.google_calendar_id) {
      await deleteEvent(a.google_event_id, settings.google_calendar_id);
    }
    const ok = await deleteAppointment(a.id);
    if (ok) {
      setOpen(false);
      toast.success("Cita excluída");
    } else {
      toast.error("Erro ao excluir cita. Tenta novamente.");
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
                        <p className="text-[10px] text-muted-foreground truncate">{aptServiceLabel(a)}</p>
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
                    <p className="text-xs text-muted-foreground truncate">{aptServiceLabel(a)} · {eur(aptTotal(a))}</p>
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
        onCreateClient={createClient}
      />

      <CancelReasonDialog
        apt={cancelModalApt}
        onClose={() => setCancelModalApt(null)}
        onConfirm={handleCancelReason}
      />
    </div>
  );
}

interface QuickCreate {
  name: string;
  phone: string;
  language: Lang;
}

function AppointmentDialog({
  open, onOpenChange, editing, presetDate, clients, services, onSave, onDelete, onStatus, onCreateClient,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AppointmentRow | null;
  presetDate: string | null;
  clients: Client[];
  services: Service[];
  onSave: (data: Partial<Appointment>, svcs: SelectedService[], extras: ExtraItem[]) => void;
  onDelete: (a: AppointmentRow) => void;
  onStatus: (a: AppointmentRow, s: AppointmentStatus) => void;
  onCreateClient: (data: Omit<Client, "id" | "created_at">) => Promise<string | false>;
}) {
  const [client_id, setClientId] = useState("");
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [extras, setExtras] = useState<ExtraItem[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [reminder, setReminder] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [quickCreate, setQuickCreate] = useState<QuickCreate | null>(null);
  const [creating, setCreating] = useState(false);

  useMemo(() => {
    if (open) {
      if (editing) {
        setClientId(editing.client_id);
        setDate(editing.date);
        setTime(editing.time);
        setNotes(editing.notes || "");
        setReminder(editing.reminder_sent);

        // Load services: prefer appointment_services join, fall back to legacy service_id
        const aptSvcs = editing.appointment_services;
        if (aptSvcs && aptSvcs.length > 0) {
          setSelectedServices(aptSvcs.map((s) => ({ service_id: s.service_id, price: s.price })));
        } else if (editing.service_id) {
          setSelectedServices([{
            service_id: editing.service_id,
            price: editing.total_price ?? editing.services?.price ?? 0,
          }]);
        } else {
          setSelectedServices([]);
        }

        setExtras(
          (editing.appointment_extras || []).map((e) => ({
            description: e.description,
            price: e.price,
          }))
        );
      } else {
        setClientId("");
        setSelectedServices([]);
        setExtras([]);
        setDate(presetDate || format(new Date(), "yyyy-MM-dd"));
        setTime("10:00");
        setNotes("");
        setReminder(true);
      }
      setConfirmDelete(false);
      setQuickCreate(null);
    }
  }, [open]);

  const totalPrice = selectedServices.reduce((s, sv) => s + sv.price, 0) +
    extras.reduce((s, e) => s + e.price, 0);

  const toggleService = (svc: Service) => {
    const exists = selectedServices.find((s) => s.service_id === svc.id);
    if (exists) {
      setSelectedServices((prev) => prev.filter((s) => s.service_id !== svc.id));
    } else {
      setSelectedServices((prev) => [...prev, { service_id: svc.id, price: svc.price }]);
    }
  };

  const updateServicePrice = (serviceId: string, price: number) => {
    setSelectedServices((prev) =>
      prev.map((s) => (s.service_id === serviceId ? { ...s, price } : s))
    );
  };

  const addExtra = () => setExtras((prev) => [...prev, { description: "", price: 0 }]);
  const removeExtra = (idx: number) => setExtras((prev) => prev.filter((_, i) => i !== idx));
  const updateExtra = (idx: number, field: "description" | "price", value: string | number) => {
    setExtras((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const submit = () => {
    if (!client_id || !date || !time) {
      toast.error("Preencha cliente, data e horário");
      return;
    }
    if (selectedServices.length === 0) {
      toast.error("Seleccione pelo menos um serviço");
      return;
    }
    onSave(
      { client_id, date, time, notes, reminder_sent: reminder, total_price: totalPrice },
      selectedServices,
      extras
    );
  };

  const handleCreateNew = (name: string) => {
    setQuickCreate({ name, phone: "", language: "ES" });
  };

  const handleQuickCreateSubmit = async () => {
    if (!quickCreate?.name || !quickCreate.phone) {
      toast.error("Nome e telefone obrigatórios");
      return;
    }
    setCreating(true);
    const newId = await onCreateClient({
      name: quickCreate.name,
      phone: quickCreate.phone,
      language: quickCreate.language,
    } as Omit<Client, "id" | "created_at">);
    setCreating(false);
    if (newId) {
      setClientId(newId);
      setQuickCreate(null);
      toast.success(`Cliente ${quickCreate.name} criada e seleccionada`);
    }
  };

  // Group active services by category
  const grouped = services.reduce((acc, s) => {
    const cat = s.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{editing ? "Editar cita" : "Nova cita"}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto pr-1 space-y-4" style={{ maxHeight: "calc(90vh - 10rem)" }}>
          {/* Client */}
          <div>
            <Label>Cliente</Label>
            {quickCreate ? (
              <div className="mt-1.5 p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                <p className="text-xs font-medium text-primary">Criar nova cliente</p>
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={quickCreate.name} onChange={(e) => setQuickCreate({ ...quickCreate, name: e.target.value })} className="rounded-lg mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Telefone WhatsApp</Label>
                  <Input placeholder="+34 698 108 173" value={quickCreate.phone} onChange={(e) => setQuickCreate({ ...quickCreate, phone: e.target.value })} className="rounded-lg mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Idioma</Label>
                  <Select value={quickCreate.language} onValueChange={(v: Lang) => setQuickCreate({ ...quickCreate, language: v })}>
                    <SelectTrigger className="rounded-lg mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">Español</SelectItem>
                      <SelectItem value="PT">Português (PT-BR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setQuickCreate(null)}>Cancelar</Button>
                  <Button size="sm" className="rounded-lg flex-1" onClick={handleQuickCreateSubmit} disabled={creating}>
                    {creating ? "A criar..." : "Criar e seleccionar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1.5">
                <ClientSearchCombobox value={client_id} onChange={setClientId} clients={clients} onCreateNew={handleCreateNew} />
              </div>
            )}
          </div>

          {/* Services multi-select */}
          <div>
            <Label>Serviços</Label>
            <div className="mt-1.5 border border-[hsl(var(--border-solid))] rounded-xl overflow-hidden divide-y divide-[hsl(var(--border-solid))] max-h-52 overflow-y-auto">
              {Object.entries(grouped).map(([cat, catSvcs]) => (
                <div key={cat}>
                  <div className="px-3 py-1.5 bg-secondary/60">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{cat}</p>
                  </div>
                  {catSvcs.map((svc) => {
                    const isSelected = selectedServices.some((s) => s.service_id === svc.id);
                    const selectedSvc = selectedServices.find((s) => s.service_id === svc.id);
                    return (
                      <div
                        key={svc.id}
                        className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-secondary/40"}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleService(svc)}
                          className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-primary border-primary" : "border-input hover:border-primary/50"
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </button>
                        <span className="flex-1 text-sm cursor-pointer select-none" onClick={() => toggleService(svc)}>
                          {svc.name_pt}
                        </span>
                        {isSelected ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              value={selectedSvc!.price}
                              onChange={(e) => updateServicePrice(svc.id, parseFloat(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="w-20 h-7 text-right text-sm rounded-md py-0 px-2"
                              min={0}
                              step={0.5}
                            />
                            <span className="text-xs text-muted-foreground">€</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground w-20 text-right cursor-pointer" onClick={() => toggleService(svc)}>
                            {eur(svc.price)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {services.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum serviço activo</div>
              )}
            </div>
          </div>

          {/* Extras */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Extras / Adicionais</Label>
              <Button type="button" size="sm" variant="outline" onClick={addExtra} className="rounded-lg h-7 text-xs gap-1">
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>
            {extras.length > 0 && (
              <div className="space-y-2">
                {extras.map((extra, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={extra.description}
                      onChange={(e) => updateExtra(idx, "description", e.target.value)}
                      placeholder="Descrição do extra"
                      className="flex-1 rounded-lg h-9 text-sm"
                    />
                    <Input
                      type="number"
                      value={extra.price || ""}
                      onChange={(e) => updateExtra(idx, "price", parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="w-20 rounded-lg h-9 text-sm text-right"
                      min={0}
                      step={0.5}
                    />
                    <span className="text-xs text-muted-foreground shrink-0">€</span>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeExtra(idx)} className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total summary */}
          {(selectedServices.length > 0 || extras.some((e) => e.description || e.price > 0)) && (
            <div className="rounded-xl border border-[hsl(var(--border-solid))] overflow-hidden text-sm">
              {selectedServices.map((s) => {
                const svc = services.find((sv) => sv.id === s.service_id);
                if (!svc) return null;
                return (
                  <div key={s.service_id} className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border-solid))]">
                    <span className="text-muted-foreground truncate flex-1 mr-2">{svc.name_pt}</span>
                    <span className="shrink-0 font-medium tabular-nums">{eur(s.price)}</span>
                  </div>
                );
              })}
              {extras.filter((e) => e.description || e.price > 0).map((e, i) => (
                <div key={`x${i}`} className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border-solid))]">
                  <span className="text-muted-foreground truncate flex-1 mr-2">{e.description || "Extra"} ✨</span>
                  <span className="shrink-0 font-medium tabular-nums">{eur(e.price)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-primary/5 font-semibold">
                <span>Total</span>
                <span className="text-primary tabular-nums">{eur(totalPrice)}</span>
              </div>
            </div>
          )}

          {/* Date / Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg mt-1.5" />
            </div>
            <div>
              <Label>Horário</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg mt-1.5" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-lg mt-1.5" />
          </div>

          {/* Reminder */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <Label className="cursor-pointer">Lembrete WhatsApp 24h antes</Label>
              <p className="text-[11px] text-muted-foreground">Enviado automaticamente via Twilio</p>
            </div>
            <Switch checked={reminder} onCheckedChange={setReminder} />
          </div>

          {/* Status buttons */}
          {editing && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[hsl(var(--border-solid))]">
              {(["confirmada", "concluida", "cancelada", "reagendada"] as AppointmentStatus[]).map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => onStatus(editing, s)} className="rounded-lg text-xs capitalize">
                  {s}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-between pt-3 border-t border-[hsl(var(--border-solid))] mt-1">
          {editing ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Tens a certeza?</p>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} className="rounded-lg">Não</Button>
                <Button size="sm" variant="destructive" onClick={() => { onDelete(editing); setConfirmDelete(false); }} className="rounded-lg">
                  Excluir
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-destructive hover:text-destructive">
                Excluir
              </Button>
            )
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancelar</Button>
            <Button onClick={submit} className="rounded-lg">{editing ? "Salvar" : "Criar cita"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CancelReasonDialog({
  apt, onClose, onConfirm,
}: {
  apt: AppointmentRow | null;
  onClose: () => void;
  onConfirm: (a: AppointmentRow, withNotice: boolean) => void;
}) {
  if (!apt) return null;
  return (
    <Dialog open={!!apt} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Motivo do cancelamento</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {apt.clients?.name} · {aptServiceLabel(apt)} · {apt.date}
        </p>
        <div className="space-y-3">
          <Button className="w-full rounded-xl justify-start gap-3 h-auto py-4" variant="outline" onClick={() => onConfirm(apt, true)}>
            <span className="text-xl">📱</span>
            <div className="text-left">
              <p className="font-medium">Cancelou com aviso</p>
              <p className="text-xs text-muted-foreground">Pontuação: −10 pontos</p>
            </div>
          </Button>
          <Button className="w-full rounded-xl justify-start gap-3 h-auto py-4 border-destructive/40 text-destructive hover:bg-destructive/5" variant="outline" onClick={() => onConfirm(apt, false)}>
            <span className="text-xl">❌</span>
            <div className="text-left">
              <p className="font-medium">Faltou sem avisar</p>
              <p className="text-xs text-muted-foreground">Pontuação: −25 pontos</p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
