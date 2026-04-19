import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useStorage, uid } from "@/lib/storage";
import { Lang, Service, Settings } from "@/lib/types";
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

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useStorage<Settings>("settings", {} as Settings);
  const [services, setServices] = useStorage<Service[]>("services", []);
  const [showKey, setShowKey] = useState(false);
  const [newSvc, setNewSvc] = useState<Partial<Service>>({ duration: 60, price: 30, active: true });

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  const addService = () => {
    if (!newSvc.name) return toast.error("Nome do serviço obrigatório");
    setServices((arr) => [...arr, { id: uid(), name: newSvc.name!, duration: Number(newSvc.duration) || 60, price: Number(newSvc.price) || 0, active: true }]);
    setNewSvc({ duration: 60, price: 30, active: true });
    toast.success("Serviço adicionado");
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Configurações</p>
        <h1 className="text-display text-3xl md:text-4xl mt-1">Preferências do estúdio</h1>
      </header>

      {/* Profile */}
      <section className="card-luxury p-6">
        <h3 className="text-display text-xl mb-4">Perfil</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Nome</Label>
            <Input value={settings.profile?.name || ""} onChange={(e) => update({ profile: { ...settings.profile, name: e.target.value } })} className="rounded-lg" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={settings.profile?.phone || ""} onChange={(e) => update({ profile: { ...settings.profile, phone: e.target.value } })} className="rounded-lg" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={settings.profile?.email || ""} onChange={(e) => update({ profile: { ...settings.profile, email: e.target.value } })} className="rounded-lg" />
          </div>
        </div>
      </section>

      {/* Working hours */}
      <section className="card-luxury p-6">
        <h3 className="text-display text-xl mb-4">Horário de funcionamento</h3>
        <div className="space-y-2">
          {DAYS.map((d) => {
            const cfg = settings.workingHours?.[d.key] || { enabled: false, start: "09:00", end: "19:00" };
            return (
              <div key={d.key} className="grid grid-cols-[100px_60px_1fr_1fr] md:grid-cols-[140px_60px_1fr_1fr] items-center gap-3 py-1">
                <span className="text-sm">{d.label}</span>
                <Switch checked={cfg.enabled} onCheckedChange={(v) => update({ workingHours: { ...settings.workingHours, [d.key]: { ...cfg, enabled: v } } })} />
                <Input type="time" value={cfg.start} disabled={!cfg.enabled} onChange={(e) => update({ workingHours: { ...settings.workingHours, [d.key]: { ...cfg, start: e.target.value } } })} className="rounded-lg" />
                <Input type="time" value={cfg.end} disabled={!cfg.enabled} onChange={(e) => update({ workingHours: { ...settings.workingHours, [d.key]: { ...cfg, end: e.target.value } } })} className="rounded-lg" />
              </div>
            );
          })}
        </div>
        <div className="mt-5 pt-5 border-t border-[hsl(var(--border-solid))]">
          <Label>Intervalo entre citas</Label>
          <Select value={String(settings.intervalBetween ?? 15)} onValueChange={(v) => update({ intervalBetween: Number(v) as 0 | 10 | 15 | 30 })}>
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

      {/* Services */}
      <section className="card-luxury p-6">
        <h3 className="text-display text-xl mb-4">Serviços</h3>
        <ul className="space-y-2 mb-4">
          {services.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--border))]">
              <div className="flex-1">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.duration} min · {eur(s.price)}</p>
              </div>
              <Switch checked={s.active} onCheckedChange={(v) => setServices((arr) => arr.map((x) => x.id === s.id ? { ...x, active: v } : x))} />
              <Button variant="ghost" size="sm" onClick={() => setServices((arr) => arr.filter((x) => x.id !== s.id))} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_auto] gap-2 p-3 rounded-xl bg-secondary/40">
          <Input placeholder="Nome do serviço" value={newSvc.name || ""} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })} className="rounded-lg" />
          <Input type="number" placeholder="Min" value={newSvc.duration || ""} onChange={(e) => setNewSvc({ ...newSvc, duration: Number(e.target.value) })} className="rounded-lg" />
          <Input type="number" step="0.01" placeholder="€" value={newSvc.price || ""} onChange={(e) => setNewSvc({ ...newSvc, price: Number(e.target.value) })} className="rounded-lg" />
          <Button onClick={addService} className="rounded-lg"><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
      </section>

      {/* Wassenger */}
      <section className="card-luxury p-6">
        <h3 className="text-display text-xl mb-4">Wassenger · WhatsApp API</h3>
        <Label>API Key</Label>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            value={settings.wassengerKey || ""}
            onChange={(e) => update({ wassengerKey: e.target.value })}
            placeholder="Cole sua API Key Wassenger aqui"
            className="rounded-lg pr-10"
          />
          <button type="button" onClick={() => setShowKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Obtenha sua chave em wassenger.com → API → Tokens</p>

        <div className="grid md:grid-cols-2 gap-4 mt-5">
          <div>
            <Label>Horário de disparo</Label>
            <Input type="time" value={settings.reminderTime || "10:00"} onChange={(e) => update({ reminderTime: e.target.value })} className="rounded-lg" />
          </div>
          <div>
            <Label>Idioma padrão</Label>
            <Select value={settings.defaultLang || "PT"} onValueChange={(v: Lang) => update({ defaultLang: v })}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PT">Português (PT-BR)</SelectItem>
                <SelectItem value="ES">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <p className="text-xs text-muted-foreground text-center">Todas as alterações são salvas automaticamente ✨</p>
    </div>
  );
}
