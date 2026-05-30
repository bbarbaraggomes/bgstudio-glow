export const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

export const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  agendada: { label: "Agendada", cls: "bg-warning/15 text-[hsl(var(--warning))] border-warning/30", dot: "bg-warning" },
  confirmada: { label: "Confirmada", cls: "bg-success/15 text-[hsl(var(--success))] border-success/30", dot: "bg-success" },
  concluida: { label: "Concluída", cls: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary" },
  cancelada: { label: "Cancelada", cls: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
  reagendada: { label: "Reagendada", cls: "bg-secondary text-foreground border-border", dot: "bg-muted-foreground" },
  no_show: { label: "Faltou", cls: "bg-destructive/20 text-destructive border-destructive/40", dot: "bg-destructive" },
};
