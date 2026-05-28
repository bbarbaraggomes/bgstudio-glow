import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Appointment, AppointmentRow } from "@/lib/types";

export function useAppointments() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("*, clients(name, phone, language), services(name_pt, name_es, duration_min, price)")
      .order("date")
      .order("time");
    if (error) {
      toast.error("Erro ao carregar agendamentos");
    } else {
      setAppointments((data as AppointmentRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const createAppointment = async (data: Omit<Appointment, "id" | "created_at">) => {
    const { error } = await supabase.from("appointments").insert([data]);
    if (error) { toast.error("Erro ao criar agendamento"); return false; }
    await fetchAppointments();
    return true;
  };

  const updateAppointment = async (id: string, data: Partial<Omit<Appointment, "id" | "created_at">>) => {
    const { error } = await supabase.from("appointments").update(data).eq("id", id);
    if (error) { toast.error("Erro ao atualizar agendamento"); return false; }
    await fetchAppointments();
    return true;
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover agendamento"); return false; }
    await fetchAppointments();
    return true;
  };

  return { appointments, loading, fetchAppointments, createAppointment, updateAppointment, deleteAppointment };
}
