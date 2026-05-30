import { supabase } from "@/lib/supabase";

export interface ClientBadge {
  label: string;
  cls: string;
}

export function getClientBadge(score: number): ClientBadge {
  if (score >= 80) return { label: "⭐ Cliente VIP", cls: "bg-success/15 text-[hsl(var(--success))] border-success/30" };
  if (score >= 60) return { label: "👍 Boa cliente", cls: "bg-blue-500/15 text-blue-600 border-blue-200/50" };
  if (score >= 40) return { label: "⚠️ Atenção", cls: "bg-warning/15 text-[hsl(var(--warning))] border-warning/30" };
  return { label: "❌ Furona", cls: "bg-destructive/15 text-destructive border-destructive/30" };
}

export function useReputation() {
  const updateClientReputation = async (clientId: string): Promise<boolean> => {
    const { data: apts, error: e1 } = await supabase
      .from("appointments")
      .select("status, date, service_id, services(price)")
      .eq("client_id", clientId);

    if (e1 || !apts) { console.error(e1); return false; }

    const done = apts.filter((a: any) => a.status === "concluida");
    const cancelled = apts.filter((a: any) => a.status === "cancelada");
    const noShows = apts.filter((a: any) => a.status === "no_show");

    const total_appointments = done.length;
    const total_cancellations = cancelled.length;
    const total_no_shows = noShows.length;
    const total_spent = done.reduce((s: number, a: any) => s + (a.services?.price ?? 0), 0);
    const reputation_score = Math.max(0, Math.min(100,
      100 + done.length * 5 - cancelled.length * 10 - noShows.length * 25
    ));

    const freq: Record<string, number> = {};
    done.forEach((a: any) => { if (a.service_id) freq[a.service_id] = (freq[a.service_id] || 0) + 1; });
    const favorite_service_id = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const doneDates = done.map((a: any) => a.date).filter(Boolean).sort();
    const last_visit = doneDates[doneDates.length - 1] ?? null;
    let visit_frequency_days: number | null = null;
    if (doneDates.length >= 2) {
      const diffs = doneDates.slice(1).map((d: string, i: number) =>
        (new Date(d).getTime() - new Date(doneDates[i]).getTime()) / 86400000
      );
      visit_frequency_days = Math.round(diffs.reduce((a: number, b: number) => a + b, 0) / diffs.length);
    }

    const { error: e2 } = await supabase.from("clients").update({
      total_appointments, total_cancellations, total_no_shows, total_spent,
      reputation_score, favorite_service_id, last_visit, visit_frequency_days,
    }).eq("id", clientId);

    if (e2) { console.error(e2); return false; }
    return true;
  };

  return { updateClientReputation };
}
