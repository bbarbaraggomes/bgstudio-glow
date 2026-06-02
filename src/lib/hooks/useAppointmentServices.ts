import { supabase } from "@/lib/supabase";
import { AppointmentExtra, AppointmentService } from "@/lib/types";
import { toast } from "sonner";

export function useAppointmentServices() {
  const saveAppointmentServices = async (
    appointmentId: string,
    services: Pick<AppointmentService, "service_id" | "price">[]
  ): Promise<boolean> => {
    await supabase.from("appointment_services").delete().eq("appointment_id", appointmentId);
    if (services.length === 0) return true;
    const { error } = await supabase.from("appointment_services").insert(
      services.map((s) => ({ appointment_id: appointmentId, service_id: s.service_id, price: s.price }))
    );
    if (error) { console.error(error); toast.error("Erro ao guardar serviços"); return false; }
    return true;
  };

  const saveAppointmentExtras = async (
    appointmentId: string,
    extras: Pick<AppointmentExtra, "description" | "price">[]
  ): Promise<boolean> => {
    await supabase.from("appointment_extras").delete().eq("appointment_id", appointmentId);
    const valid = extras.filter((e) => e.description.trim() || e.price > 0);
    if (valid.length === 0) return true;
    const { error } = await supabase.from("appointment_extras").insert(
      valid.map((e) => ({ appointment_id: appointmentId, description: e.description, price: e.price }))
    );
    if (error) { console.error(error); toast.error("Erro ao guardar extras"); return false; }
    return true;
  };

  return { saveAppointmentServices, saveAppointmentExtras };
}
