import { useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";
import { useServices } from "@/lib/hooks/useServices";
import { useStorage } from "@/lib/storage";
import { Lang, Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { eur } from "@/lib/format";
import { toast } from "sonner";

const DAYS = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

const DEFAULT_HOURS = {
  monday: { enabled: true, start: "09:00", end: "19:00" },
  tuesday: { enabled: true, start: "09:00", end: "19:00" },
  wednesday: { enabled: true, start: "09:00", end: "19:00" },
  thursday: { enabled: true, start: "09:00", end: "19:00" },
  friday: { enabled: true, start: "09:00", end: "19:00" },
  saturday: { enabled: true, start: "10:00", end: "16:00" },
  sunday: { enabled: false, start: "10:00", end: "14:00" },
};

const SERVICE_CATEGORIES = [
  { value: "manicure_pedicure", label: "Manicure / Pedicure" },
  { value: "extensao", label: "Extensão" },
  { value: "extras", label: "Extras" },
  { value: "cursos", label: "Cursos" },
];

export default function ConfiguracoesPage() {
  const { settings, loading, error, updateSettings } = useSettings();
  const { services, createService, updateService, deleteService } = useServices();

  // Horários e preferências locais (não estão na tabela Supabase)
  const [workingHours, setWorkingHours] = useStorage<Record<string, { enabled: boolean; start: string; end: string }>>("workingHours", DEFAULT_HOURS);
  const [intervalBetween, setIntervalBetween] = useStorage<number>("intervalBetween", 15);
  const [defaultLang, setDefaultLang] = useStorage<Lang>("defaultLang", "PT");

  // Campos Supabase — Perfil + Twilio
  const [studioName, setStudioName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [reminderTime, setReminderTime] = useState("10:00");
  const [showSid, setShowSid] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Google Calendar
  const [calendarId, setCalendarId] = useState("");
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(true);

  // Serviço em edição
  const [editSvc, setEditSvc] = useState<Service | null>(null);
  const [newSvc, setNewSvc] = useState<Partial<Service>>({ duration_min: 60, price: 30, active: true, category: "manicure_pedicure" });

  useEffect(() => {
    if (settings) {
      setStudioName(settings.studio_name || "");
      setWhatsappNumber(settings.whatsapp_number || "");
      setTwilioSid(settings.twilio_sid || "");
      setTwilioToken(settings.twilio_token || "");
      setReminderTime(settings.reminder_time || "10:00");
      setCalendarId(settings.google_calendar_id || "");
      setGoogleSyncEnabled(settings.google_sync_enabled !== false);
    }
  }, [settings]);

  const saveProfile = async () => {
    const ok = await updateSettings({
      studio_name: studioName,
      whatsapp_number: whatsappNumber,
      twilio_sid: twilioSid,
      twilio_token: twilioToken,
      reminder_time: reminderTime,
      google_calendar_id: settings?.google_calendar_id,
      google_connected: settings?.google_connected,
      google_sync_enabled: settings?.google_sync_enabled,
    });
    if (ok) toast.success("Configurações salvas ✨");
  };

  const saveCalendarSettings = async () => {
    const ok = await updateSettings({
      studio_name: studioName,
      whatsapp_number: whatsappNumber,
      twilio_sid: twilioSid,
      twilio_token: twilioToken,
      reminder_time: reminderTime,
      google_calendar_id: calendarId || undefined,
      google_connected: settings?.google_connected,
      google_sync_enabled: googleSyncEnabled,
    });
    if (ok) toast.success("Configurações Google Calendar salvas ✨");
  };

  const handleGoogleConnect = () => {
    // TODO: Configurar Google Cloud Console e definir VITE_GOOGLE_CLIENT_ID no Vercel
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error("VITE_GOOGLE_CLIENT_ID não configurado. Consulte a documentação.");
      return;
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/api/google-calendar/auth`,
      scope: "https://www.googleapis.com/auth/calendar",
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
    });
    const popup = window.open(`https://accounts.google.com/o/oauth2/auth?${params}`, "_blank", "width=500,height=600");
    const onMessage = (e: MessageEvent) => {
      if (e.data === "google_auth_success") {
        window.removeEventListener("message", onMessage);
        toast.success("Google Calendar conectado com sucesso ✓");
        // O hook irá detectar google_connected=true no próximo fetch
      }
    };
    window.addEventListener("message", onMessage);
  };

  const addService = async () => {
    if (!newSvc.name_pt) return toast.error("Nome do serviço obrigatório");
    const ok = await createService({
      name_pt: newSvc.name_pt!,
      name_es: newSvc.name_es || newSvc.name_pt!,
      category: newSvc.category || "manicure_pedicure",
      duration_min: Number(newSvc.duration_min) || 60,
      price: Number(newSvc.price) || 0,
      active: true,
    });
    if (ok) {
      setNewSvc({ duration_min: 60, price: 30, active: true, category: "manicure_pedicure" });
      toast.success("Serviço adicionado");
    }
  };

  const saveEditedService = async (data: Partial<Service>) => {
    if (!editSvc) return;
    const ok = await updateService(editSvc.id, data);
    if (ok) {
      setEditSvc(null);
      toast.success("Serviço actualizado");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground animate-pulse">A carregar configurações...</p>
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

  const googleConnected = !!settings?.google_connected;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Configurações</p>
        <h1 className="text-display text-3xl md:text-4xl mt-1">Preferências do estúdio</h1>
      </header>

      {/* Perfil */}
      <section className="card-luxury p-6">
        <h3 className="text-display text-xl mb-4">Perfil</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Nome do estúdio</Label>
            <Input value={studioName} onChange={(e) => setStudioName(e.target.value)} className="rounded-lg" />
          </div>
          <div>
            <Label>Número WhatsApp (com código do país)</Label>
            <Input placeholder="+34 698 108 173" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="rounded-lg" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveProfile} className="rounded-lg">Salvar perfil</Button>
        </div>
      </section>

      {/* Horário de funcionamento — local */}
      <section className="card-luxury p-6">
        <h3 className="text-display text-xl mb-4">Horário de funcionamento</h3>
        <div className="space-y-2">
          {DAYS.map((d) => {
            const cfg = workingHours[d.key] || { enabled: false, start: "09:00", end: "19:00" };
            return (
              <div key={d.key} className="grid grid-cols-[100px_60px_1fr_1fr] md:grid-cols-[140px_60px_1fr_1fr] items-center gap-3 py-1">
                <span className="text-sm">{d.label}</span>
                <Switch checked={cfg.enabled} onCheckedChange={(v) => setWorkingHours({ ...workingHours, [d.key]: { ...cfg, enabled: v } })} />
                <Input type="time" value={cfg.start} disabled={!cfg.enabled} onChange={(e) => setWorkingHours({ ...workingHours, [d.key]: { ...cfg, start: e.target.value } })} className="rounded-lg" />
                <Input type="time" value={cfg.end} disabled={!cfg.enabled} onChange={(e) => setWorkingHours({ ...workingHours, [d.key]: { ...cfg, end: e.target.value } })} className="rounded-lg" />
              </div>
            );
          })}
        </div>
        <div className="mt-5 pt-5 border-t border-[hsl(var(--border-solid))]">
          <Label>Intervalo entre citas</Label>
          <Select value={String(intervalBetween)} onValueChange={(v) => setIntervalBetween(Number(v))}>
            <SelectTrigger className="md:w-56 rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sem intervalo</SelectItem>
              <SelectItem value="10">10 minutos</SelectItem>
              <SelectItem value="15">15 minutos</SelectItem>
              <SelectItem value="30">30 minutos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Serviços */}
      <section className="card-luxury p-6">
        <h3 className="text-display text-xl mb-4">Serviços</h3>
        <ul className="space-y-2 mb-4">
          {services.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--border))]">
              <div className="flex-1">
                <p className="font-medium">{s.name_pt}</p>
                <p className="text-xs text-muted-foreground">
                  {s.name_es && s.name_es !== s.name_pt ? `${s.name_es} · ` : ""}
                  {s.duration_min} min · {eur(s.price)} · {s.category}
                </p>
              </div>
              <Switch checked={s.active} onCheckedChange={(v) => updateService(s.id, { active: v })} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditSvc(s)}
                className="text-muted-foreground hover:text-primary"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteService(s.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>

        {/* Formulário de novo serviço */}
        <div className="p-4 rounded-xl bg-secondary/40 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Novo serviço</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              placeholder="Nome PT-BR *"
              value={newSvc.name_pt || ""}
              onChange={(e) => setNewSvc({ ...newSvc, name_pt: e.target.value })}
              className="rounded-lg"
            />
            <Input
              placeholder="Nome Español"
              value={newSvc.name_es || ""}
              onChange={(e) => setNewSvc({ ...newSvc, name_es: e.target.value })}
              className="rounded-lg"
            />
            <Select
              value={newSvc.category || "manicure_pedicure"}
              onValueChange={(v) => setNewSvc({ ...newSvc, category: v })}
            >
              <SelectTrigger className="rounded-lg"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              type="number"
              placeholder="Duração (min)"
              value={newSvc.duration_min || ""}
              onChange={(e) => setNewSvc({ ...newSvc, duration_min: Number(e.target.value) })}
              className="rounded-lg"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Preço (€)"
              value={newSvc.price || ""}
              onChange={(e) => setNewSvc({ ...newSvc, price: Number(e.target.value) })}
              className="rounded-lg"
            />
            <Button onClick={addService} className="rounded-lg whitespace-nowrap">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </div>
      </section>

      {/* Twilio */}
      <section className="card-luxury p-6">
        <h3 className="text-display text-xl mb-4">Twilio · WhatsApp API</h3>
        <div className="space-y-4">
          <div>
            <Label>Twilio Account SID</Label>
            <div className="relative">
              <Input
                type={showSid ? "text" : "password"}
                value={twilioSid}
                onChange={(e) => setTwilioSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="rounded-lg pr-10"
              />
              <button type="button" onClick={() => setShowSid((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showSid ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Twilio Auth Token</Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={twilioToken}
                onChange={(e) => setTwilioToken(e.target.value)}
                placeholder="Token de autenticação"
                className="rounded-lg pr-10"
              />
              <button type="button" onClick={() => setShowToken((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Horário de disparo</Label>
              <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className="rounded-lg" />
            </div>
            <div>
              <Label>Idioma padrão (local)</Label>
              <Select value={defaultLang} onValueChange={(v: Lang) => setDefaultLang(v)}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PT">Português (PT-BR)</SelectItem>
                  <SelectItem value="ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Obtenha as credenciais em twilio.com → Console → Account Info</p>
          <div className="flex justify-end">
            <Button onClick={saveProfile} className="rounded-lg">Salvar configurações</Button>
          </div>
        </div>
      </section>

      {/* Google Calendar */}
      <section className="card-luxury p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-display text-xl">Google Calendar</h3>
          <div className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
            googleConnected
              ? "bg-success/10 border-success/30 text-[hsl(var(--success))]"
              : "bg-secondary border-[hsl(var(--border))] text-muted-foreground"
          }`}>
            <span className={`h-2 w-2 rounded-full ${googleConnected ? "bg-[hsl(var(--success))]" : "bg-muted-foreground"}`} />
            {googleConnected ? "Conectado ✓" : "Não conectado"}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Google Calendar ID</Label>
            <Input
              placeholder="exemplo@gmail.com ou ID do calendário"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              className="rounded-lg"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Encontre o Calendar ID em Google Calendar → Configurações do calendário → Integrar calendário
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <p className="text-sm font-medium">Sincronizar automaticamente</p>
              <p className="text-[11px] text-muted-foreground">Adicionar ao Google Calendar ao criar cita</p>
            </div>
            <Switch checked={googleSyncEnabled} onCheckedChange={setGoogleSyncEnabled} />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleGoogleConnect}
              className="rounded-lg border-primary/40 text-primary hover:bg-primary/5"
            >
              {googleConnected ? "Reconectar com Google" : "Conectar com Google"}
            </Button>
            <Button onClick={saveCalendarSettings} className="rounded-lg">
              Salvar configurações
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {/* TODO: Configurar Google Cloud Console - ver documentação */}
            Requer configuração no Google Cloud Console (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no Vercel).
          </p>
        </div>
      </section>

      <p className="text-xs text-muted-foreground text-center">Horários e preferências locais são guardados automaticamente ✨</p>

      {/* Dialog de edição de serviço */}
      <ServiceEditDialog
        service={editSvc}
        onClose={() => setEditSvc(null)}
        onSave={saveEditedService}
      />
    </div>
  );
}

function ServiceEditDialog({
  service,
  onClose,
  onSave,
}: {
  service: Service | null;
  onClose: () => void;
  onSave: (data: Partial<Service>) => void;
}) {
  const [form, setForm] = useState<Partial<Service>>({});

  useEffect(() => {
    if (service) setForm({ ...service });
  }, [service]);

  if (!service) return null;

  const submit = () => {
    if (!form.name_pt) return toast.error("Nome PT-BR obrigatório");
    onSave({
      name_pt: form.name_pt,
      name_es: form.name_es || form.name_pt,
      category: form.category || "manicure_pedicure",
      price: Number(form.price) || 0,
      duration_min: Number(form.duration_min) || 60,
      active: form.active !== false,
    });
  };

  return (
    <Dialog open={!!service} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Editar serviço</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome PT-BR *</Label>
            <Input
              value={form.name_pt || ""}
              onChange={(e) => setForm({ ...form, name_pt: e.target.value })}
              className="rounded-lg"
            />
          </div>
          <div>
            <Label>Nome Español</Label>
            <Input
              value={form.name_es || ""}
              onChange={(e) => setForm({ ...form, name_es: e.target.value })}
              className="rounded-lg"
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select
              value={form.category || "manicure_pedicure"}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.price ?? ""}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="rounded-lg"
              />
            </div>
            <div>
              <Label>Duração (min)</Label>
              <Input
                type="number"
                value={form.duration_min ?? ""}
                onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })}
                className="rounded-lg"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <Label>Serviço activo</Label>
            <Switch
              checked={form.active !== false}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="rounded-lg">Cancelar</Button>
            <Button onClick={submit} className="rounded-lg">Guardar alterações</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
