import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Appointment, AppointmentRow } from "@/lib/types";

const normalizeTime = (t: string) => (t?.length > 5 ? t.slice(0, 5) : t);

export function useAppointments() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("*, clients(name, phone, language), services(name_pt, name_es, duration_min, price), appointment_services(service_id, price, services(name_pt)), appointment_extras(description, price)")
      .order("date")
      .order("time");
    if (error) {
      console.error(error);
      setError("Erro ao carregar agendamentos");
      toast.error("Erro ao carregar agendamentos");
    } else {
      setError(null);
      const rows = (data as AppointmentRow[]) ?? [];
      setAppointments(rows.map((a) => ({ ...a, time: normalizeTime(a.time) })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const createAppointment = async (data: Omit<Appointment, "id" | "created_at">) => {
    const { data: created, error } = await supabase
      .from("appointments")
      .insert([data])
      .select("id")
      .single();
    if (error) { console.error(error); toast.error("Erro ao criar agendamento"); return null; }
    await fetchAppointments();
    return created.id as string;
  };

  const updateAppointment = async (id: string, data: Partial<Omit<Appointment, "id" | "created_at">>) => {
    const { error } = await supabase.from("appointments").update(data).eq("id", id);
    if (error) { console.error(error); toast.error("Erro ao atualizar agendamento"); return false; }
    await fetchAppointments();
    return true;
  };

  const deleteAppointment = async (id: string) => {
    await supabase.from("financial_records").delete().eq("appointment_id", id);
    await supabase.from("whatsapp_logs").delete().eq("appointment_id", id);
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) { console.error(error); toast.error("Erro ao remover agendamento"); return false; }
    await fetchAppointments();
    return true;
  };

  return { appointments, loading, error, fetchAppointments, createAppointment, updateAppointment, deleteAppointment };
}
