import { useMemo, useState } from "react";
import { Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useStorage, uid } from "@/lib/storage";
import { Appointment, ExpenseCategory, PaymentMethod, Service, Transaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { eur } from "@/lib/format";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, subMonths, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CATS: ExpenseCategory[] = ["Material", "Aluguel", "Marketing", "Curso", "Outro"];
const METHODS: PaymentMethod[] = ["Dinheiro", "Bizum", "Cartão", "Transferência"];
const PIE_COLORS = ["#C9A96E", "#A07840", "#E8B86D", "#7DAB8B", "#F2DDD6", "#8C7B74"];

export default function FinanceiroPage() {
  const [transactions, setTransactions] = useStorage<Transaction[]>("transactions", []);
  const [appointments] = useStorage<Appointment[]>("appointments", []);
  const [services] = useStorage<Service[]>("services", []);
  const [open, setOpen] = useState<"income" | "expense" | null>(null);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const inMonth = (d: string) => {
    const date = parseISO(d);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  };

  const monthIncome = transactions.filter((t) => t.type === "income" && inMonth(t.date)).reduce((s, t) => s + t.amount, 0);
  const monthExpense = transactions.filter((t) => t.type === "expense" && inMonth(t.date)).reduce((s, t) => s + t.amount, 0);
  const profit = monthIncome - monthExpense;
  const monthApts = appointments.filter((a) => inMonth(a.date)).length;

  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const ms = startOfMonth(d), me = endOfMonth(d);
      const inv = transactions
        .filter((t) => t.type === "income" && isWithinInterval(parseISO(t.date), { start: ms, end: me }))
        .reduce((s, t) => s + t.amount, 0);
      return { month: format(d, "MMM", { locale: ptBR }), value: inv };
    });
  }, [transactions]);

  const serviceData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t) => t.type === "income").forEach((t) => {
      const k = t.serviceName || "Outros";
      map[k] = (map[k] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const remove = (id: string) => {
    setTransactions((arr) => arr.filter((t) => t.id !== id));
    toast.success("Lançamento removido");
  };

  const KPIS = [
    { label: "Faturamento mês", value: eur(monthIncome), icon: TrendingUp, color: "text-[hsl(var(--success))]" },
    { label: "Despesas mês", value: eur(monthExpense), icon: TrendingDown, color: "text-destructive" },
    { label: "Lucro líquido", value: eur(profit), icon: Wallet, color: "text-primary" },
    { label: "Citas no mês", value: monthApts, icon: TrendingUp, color: "text-[hsl(var(--warning))]" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Financeiro</p>
          <h1 className="text-display text-3xl md:text-4xl mt-1 capitalize">{format(now, "MMMM 'de' yyyy", { locale: ptBR })}</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpen("income")} className="rounded-xl"><Plus className="h-4 w-4" /> Receita</Button>
          <Button onClick={() => setOpen("expense")} variant="outline" className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/5"><Plus className="h-4 w-4" /> Despesa</Button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((k) => (
          <div key={k.label} className="card-luxury p-5">
            <div className="flex items-start justify-between">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{k.label}</p>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className="text-display text-3xl mt-3">{k.value}</p>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="card-luxury p-5 lg:col-span-2">
          <h3 className="text-display text-xl mb-4">Faturamento (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" stroke="#8C7B74" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#8C7B74" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} />
              <Tooltip
                cursor={{ fill: "#F2DDD6", opacity: 0.4 }}
                contentStyle={{ background: "#fff", border: "1px solid rgba(201,169,110,0.3)", borderRadius: 12, fontFamily: "Jost" }}
                formatter={(v: number) => eur(v)}
              />
              <Bar dataKey="value" fill="#C9A96E" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-luxury p-5">
          <h3 className="text-display text-xl mb-4">Receita por serviço</h3>
          {serviceData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={serviceData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {serviceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => eur(v)} contentStyle={{ background: "#fff", border: "1px solid rgba(201,169,110,0.3)", borderRadius: 12, fontFamily: "Jost", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="card-luxury p-5">
        <Tabs defaultValue="all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-display text-xl">Lançamentos</h3>
            <TabsList className="bg-secondary/60">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="income">Receitas</TabsTrigger>
              <TabsTrigger value="expense">Despesas</TabsTrigger>
            </TabsList>
          </div>
          {(["all", "income", "expense"] as const).map((tab) => (
            <TabsContent key={tab} value={tab}>
              <TransactionTable
                items={transactions
                  .filter((t) => tab === "all" || t.type === tab)
                  .sort((a, b) => (a.date < b.date ? 1 : -1))}
                onDelete={remove}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <TxDialog open={!!open} type={open} onOpenChange={() => setOpen(null)} services={services} appointments={appointments} onSave={(t) => { setTransactions((arr) => [...arr, t]); setOpen(null); toast.success("Lançamento criado"); }} />
    </div>
  );
}

function TransactionTable({ items, onDelete }: { items: Transaction[]; onDelete: (id: string) => void }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground py-12 text-center">Nenhum lançamento</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-[hsl(var(--border-solid))]">
            <th className="py-3">Data</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Pagamento</th>
            <th className="text-right">Valor</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id} className="border-b border-[hsl(var(--border-solid))] hover:bg-secondary/30 transition-colors">
              <td className="py-3 text-muted-foreground">{format(parseISO(t.date), "dd/MM/yy")}</td>
              <td>{t.serviceName || t.description || "—"}</td>
              <td className="text-muted-foreground">{t.category || (t.type === "income" ? "Serviço" : "—")}</td>
              <td className="text-muted-foreground">{t.paymentMethod || "—"}</td>
              <td className={`text-right font-medium ${t.type === "income" ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                {t.type === "income" ? "+" : "-"} {eur(t.amount)}
              </td>
              <td><Button variant="ghost" size="sm" onClick={() => onDelete(t.id)} className="text-muted-foreground hover:text-destructive">×</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TxDialog({
  open, type, onOpenChange, services, appointments, onSave,
}: {
  open: boolean; type: "income" | "expense" | null; onOpenChange: (v: boolean) => void;
  services: Service[]; appointments: Appointment[];
  onSave: (t: Transaction) => void;
}) {
  const [form, setForm] = useState<Partial<Transaction>>({});
  useMemo(() => {
    if (open) setForm({ date: format(new Date(), "yyyy-MM-dd"), paymentMethod: "Dinheiro" });
  }, [open]);

  const submit = () => {
    if (!form.amount || form.amount <= 0) return toast.error("Valor obrigatório");
    onSave({
      id: uid(),
      type: type!,
      amount: Number(form.amount),
      date: form.date!,
      serviceName: form.serviceName,
      paymentMethod: form.paymentMethod,
      category: form.category,
      description: form.description,
      appointmentId: form.appointmentId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader><DialogTitle className="font-display text-2xl">{type === "income" ? "Nova receita" : "Nova despesa"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {type === "income" ? (
            <>
              <div>
                <Label>Serviço</Label>
                <Select value={form.serviceName} onValueChange={(v) => setForm({ ...form, serviceName: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Selecionar serviço" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={form.paymentMethod} onValueChange={(v: PaymentMethod) => setForm({ ...form, paymentMethod: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v: ExpenseCategory) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg" />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (€)</Label>
              <Input type="number" step="0.01" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="rounded-lg" />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancelar</Button>
            <Button onClick={submit} className="rounded-lg">Criar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
