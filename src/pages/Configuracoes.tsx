import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";
import { useServices } from "@/lib/hooks/useServices";
import { useStorage } from "@/lib/storage";
import { Lang, Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
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

export default function ConfiguracoesPage() {
  const { settings, loading, error, updateSettings } = useSettings();
  const { services, createService, updateService, deleteService } = useServices();

  // Horários e preferências locais (não estão na tabela Supabase)
  const [workingHours, setWorkingHours] = useStorage<Record<string, { enabled: boolean; start: string; end: string }>>("workingHours", DEFAULT_HOURS);
  const [intervalBetween, setIntervalBetween] = useStorage<number>("intervalBetween", 15);
  const [defaultLang, setDefaultLang] = useStorage<Lang>("defaultLang", "PT");

  // Estado local para campos Supabase
  const [studioName, setStudioName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [reminderTime, setReminderTime] = useState("10:00");
  const [showSid, setShowSid] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [newSvc, setNewSvc] = useState<Partial<Service>>({ duration_min: 60, price: 30, active: true });

  useEffect(() => {
    if (settings) {
      setStudioName(settings.studio_name || "");
      setWhatsappNumber(settings.whatsapp_number || "");
      setTwilioSid(settings.twilio_sid || "");
      setTwilioToken(settings.twilio_token || "");
      setReminderTime(settings.reminder_time || "10:00");
    }
  }, [settings]);

  const saveProfile = async () => {
    const ok = await updateSettings({
      studio_name: studioName,
      whatsapp_number: whatsappNumber,
      twilio_sid: twilioSid,
      twilio_token: twilioToken,
      reminder_time: reminderTime,
    });
    if (ok) toast.success("Configurações salvas ✨");
  };

  const addService = async () => {
    if (!newSvc.name_pt) return toast.error("Nome do serviço obrigatório");
    const ok = await createService({
      name_pt: newSvc.name_pt!,
      name_es: newSvc.name_es || newSvc.name_pt!,
      category: newSvc.category || "Manicure",
      duration_min: Number(newSvc.duration_min) || 60,
      price: Number(newSvc.price) || 0,
      active: true,
    });
    if (ok) {
      setNewSvc({ duration_min: 60, price: 30, active: true });
      toast.success("Serviço adicionado");
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
                <p className="text-xs text-muted-foreground">{s.name_es && s.name_es !== s.name_pt ? `${s.name_es} · ` : ""}{s.duration_min} min · {eur(s.price)} · {s.category}</p>
              </div>
              <Switch checked={s.active} onCheckedChange={(v) => updateService(s.id, { active: v })} />
              <Button variant="ghost" size="sm" onClick={() => deleteService(s.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_100px_100px_auto] gap-2 p-3 rounded-xl bg-secondary/40">
          <Input placeholder="Nome PT" value={newSvc.name_pt || ""} onChange={(e) => setNewSvc({ ...newSvc, name_pt: e.target.value })} className="rounded-lg" />
          <Input placeholder="Nome ES" value={newSvc.name_es || ""} onChange={(e) => setNewSvc({ ...newSvc, name_es: e.target.value })} className="rounded-lg" />
          <Input type="number" placeholder="Min" value={newSvc.duration_min || ""} onChange={(e) => setNewSvc({ ...newSvc, duration_min: Number(e.target.value) })} className="rounded-lg" />
          <Input type="number" step="0.01" placeholder="€" value={newSvc.price || ""} onChange={(e) => setNewSvc({ ...newSvc, price: Number(e.target.value) })} className="rounded-lg" />
          <Button onClick={addService} className="rounded-lg"><Plus className="h-4 w-4" /> Adicionar</Button>
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

      <p className="text-xs text-muted-foreground text-center">Horários e preferências locais são guardados automaticamente ✨</p>
    </div>
  );
}
