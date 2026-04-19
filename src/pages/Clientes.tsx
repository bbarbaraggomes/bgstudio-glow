import { useMemo, useState } from "react";
import { Plus, Search, Phone, Calendar, Trash2 } from "lucide-react";
import { useStorage, uid } from "@/lib/storage";
import { Appointment, Client, Lang } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/Avatar";
import { eur } from "@/lib/format";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientesPage() {
  const [clients, setClients] = useStorage<Client[]>("clients", []);
  const [appointments] = useStorage<Appointment[]>("appointments", []);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "recent" | "spent">("name");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [detail, setDetail] = useState<Client | null>(null);

  const stats = (cId: string) => {
    const ap = appointments.filter((a) => a.clientId === cId);
    const done = ap.filter((a) => a.status === "concluida");
    const totalSpent = done.reduce((s, a) => s + a.price, 0);
    const last = ap.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return { count: ap.length, totalSpent, last: last?.date };
  };

  const list = useMemo(() => {
    const filtered = clients.filter((c) =>
      [c.name, c.phone, c.email].some((v) => v?.toLowerCase().includes(q.toLowerCase()))
    );
    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "spent") return stats(b.id).totalSpent - stats(a.id).totalSpent;
      return (stats(b.id).last || "").localeCompare(stats(a.id).last || "");
    });
  }, [clients, q, sort, appointments]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (c: Client) => { setEditing(c); setOpen(true); };

  const save = (data: Omit<Client, "id" | "createdAt"> & { id?: string }) => {
    if (data.id) {
      setClients((arr) => arr.map((c) => (c.id === data.id ? { ...c, ...data } as Client : c)));
      toast.success("Cliente atualizada");
    } else {
      setClients((arr) => [...arr, { ...data, id: uid(), createdAt: new Date().toISOString() }]);
      toast.success("Cliente cadastrada ✨");
    }
    setOpen(false);
  };

  const remove = (c: Client) => {
    setClients((arr) => arr.filter((x) => x.id !== c.id));
    setDetail(null);
    toast.success("Cliente removida");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Clientes</p>
          <h1 className="text-display text-3xl md:text-4xl mt-1">{clients.length} clientes</h1>
        </div>
        <Button onClick={openNew} className="rounded-xl"><Plus className="h-4 w-4" /> Nova cliente</Button>
      </header>

      <div className="card-luxury p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, telefone ou email..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 rounded-lg" />
        </div>
        <Select value={sort} onValueChange={(v: "name" | "recent" | "spent") => setSort(v)}>
          <SelectTrigger className="md:w-56 rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nome (A-Z)</SelectItem>
            <SelectItem value="recent">Última visita</SelectItem>
            <SelectItem value="spent">Total gasto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((c) => {
          const s = stats(c.id);
          return (
            <button
              key={c.id}
              onClick={() => setDetail(c)}
              className="card-luxury p-5 text-left hover:shadow-card hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <Avatar name={c.name} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.countryCode} {c.phone}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary">{c.lang}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-[hsl(var(--border-solid))] grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-display text-lg leading-none">{s.count}</p>
                  <p className="text-[10px] uppercase text-muted-foreground mt-1">Citas</p>
                </div>
                <div>
                  <p className="text-display text-lg leading-none">{eur(s.totalSpent)}</p>
                  <p className="text-[10px] uppercase text-muted-foreground mt-1">Total</p>
                </div>
                <div>
                  <p className="text-xs leading-none mt-1">{s.last ? format(parseISO(s.last), "dd/MM") : "—"}</p>
                  <p className="text-[10px] uppercase text-muted-foreground mt-1">Última</p>
                </div>
              </div>
            </button>
          );
        })}
        {list.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-16">Nenhuma cliente encontrada</div>
        )}
      </div>

      <ClientDialog open={open} onOpenChange={setOpen} editing={editing} onSave={save} />
      <ClientDetail client={detail} onClose={() => setDetail(null)} appointments={appointments} onEdit={(c) => { setDetail(null); openEdit(c); }} onDelete={remove} />
    </div>
  );
}

function ClientDialog({
  open, onOpenChange, editing, onSave,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Client | null;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState<Partial<Client>>({});
  useMemo(() => {
    if (open) {
      setForm(editing || { countryCode: "+34", lang: "ES" });
    }
  }, [open]);

  const submit = () => {
    if (!form.name || !form.phone) return toast.error("Nome e telefone obrigatórios");
    onSave({ ...form, id: editing?.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">{editing ? "Editar cliente" : "Nova cliente"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg" />
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-2">
            <div>
              <Label>País</Label>
              <Select value={form.countryCode} onValueChange={(v: "+34" | "+55") => setForm({ ...form, countryCode: v })}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="+34">🇪🇸 +34</SelectItem>
                  <SelectItem value="+55">🇧🇷 +55</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Telefone (WhatsApp)</Label>
              <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg" />
            </div>
            <div>
              <Label>Aniversário</Label>
              <Input type="date" value={form.birthdate || ""} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} className="rounded-lg" />
            </div>
          </div>
          <div>
            <Label>Idioma das mensagens</Label>
            <Select value={form.lang} onValueChange={(v: Lang) => setForm({ ...form, lang: v })}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PT">Português (PT-BR)</SelectItem>
                <SelectItem value="ES">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações / alergias / preferências</Label>
            <Textarea rows={3} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancelar</Button>
            <Button onClick={submit} className="rounded-lg">{editing ? "Salvar" : "Criar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClientDetail({
  client, onClose, appointments, onEdit, onDelete,
}: {
  client: Client | null; onClose: () => void; appointments: Appointment[];
  onEdit: (c: Client) => void; onDelete: (c: Client) => void;
}) {
  if (!client) return null;
  const ap = appointments.filter((a) => a.clientId === client.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const done = ap.filter((a) => a.status === "concluida");
  const totalSpent = done.reduce((s, a) => s + a.price, 0);
  const waUrl = `https://wa.me/${(client.countryCode + client.phone).replace(/\D/g, "")}`;

  return (
    <Dialog open={!!client} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl rounded-2xl">
        <DialogHeader><DialogTitle className="sr-only">{client.name}</DialogTitle></DialogHeader>
        <div className="flex items-center gap-4">
          <Avatar name={client.name} size={64} />
          <div className="flex-1">
            <h3 className="text-display text-2xl">{client.name}</h3>
            <p className="text-sm text-muted-foreground">{client.countryCode} {client.phone} · {client.lang}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3 rounded-xl bg-secondary/50 text-center">
            <p className="text-display text-2xl">{ap.length}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Citas</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/50 text-center">
            <p className="text-display text-2xl">{eur(totalSpent)}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Gasto</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/50 text-center">
            <p className="text-display text-base mt-1">{ap[0] ? format(parseISO(ap[0].date), "dd/MM/yy") : "—"}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Última</p>
          </div>
        </div>

        {client.notes && (
          <div className="p-3 rounded-lg bg-warning/10 text-xs">
            <p className="font-medium mb-1">Observações</p>
            <p className="text-muted-foreground">{client.notes}</p>
          </div>
        )}

        <div className="mt-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Histórico</p>
          <ul className="max-h-48 overflow-y-auto space-y-1">
            {ap.length === 0 && <li className="text-sm text-muted-foreground py-3 text-center">Sem histórico</li>}
            {ap.map((a) => (
              <li key={a.id} className="flex justify-between text-xs py-2 border-b border-[hsl(var(--border-solid))]">
                <span>{format(parseISO(a.date), "dd/MM/yyyy", { locale: ptBR })} · {a.time}</span>
                <span className="text-muted-foreground capitalize">{a.status}</span>
                <span>{eur(a.price)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2 pt-3">
          <a href={waUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-lg border-success/40 text-[hsl(var(--success))]"><Phone className="h-4 w-4" /> WhatsApp</Button>
          </a>
          <Button variant="outline" onClick={() => onEdit(client)} className="rounded-lg">Editar</Button>
          <Button variant="ghost" onClick={() => onDelete(client)} className="rounded-lg text-destructive ml-auto"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
