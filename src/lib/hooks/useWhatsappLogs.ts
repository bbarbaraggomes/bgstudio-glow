import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Lang, WhatsappLog } from "@/lib/types";

export function useWhatsappLogs() {
  const [logs, setLogs] = useState<WhatsappLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_logs")
      .select("*, clients(name)")
      .order("sent_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar logs de WhatsApp");
    } else {
      setLogs((data as WhatsappLog[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const createLog = async (data: {
    client_id: string;
    appointment_id: string;
    phone: string;
    message: string;
    language: Lang;
    status: WhatsappLog["status"];
    twilio_sid?: string;
  }) => {
    const payload = { ...data, sent_at: new Date().toISOString() };
    const { error } = await supabase.from("whatsapp_logs").insert([payload]);
    if (error) { toast.error("Erro ao registar log de WhatsApp"); return false; }
    await fetchLogs();
    return true;
  };

  return { logs, loading, fetchLogs, createLog };
}
