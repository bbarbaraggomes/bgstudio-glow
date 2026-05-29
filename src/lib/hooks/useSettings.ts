import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Settings } from "@/lib/types";

const normalizeTime = (t: string) => (t?.length > 5 ? t.slice(0, 5) : t);

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error(error);
      setError("Erro ao carregar configurações");
      toast.error("Erro ao carregar configurações");
    } else {
      setError(null);
      setSettings(data ? { ...data, reminder_time: normalizeTime(data.reminder_time) } : null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (data: Omit<Settings, "id" | "updated_at">) => {
    const payload = { ...data, updated_at: new Date().toISOString() };
    let error;
    if (settings?.id) {
      ({ error } = await supabase.from("settings").update(payload).eq("id", settings.id));
    } else {
      ({ error } = await supabase.from("settings").insert([payload]));
    }
    if (error) { console.error(error); toast.error("Erro ao salvar configurações"); return false; }
    await fetchSettings();
    return true;
  };

  return { settings, loading, error, fetchSettings, updateSettings };
}
