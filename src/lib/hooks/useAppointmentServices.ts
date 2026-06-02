import { supabase } from "@/lib/supabase";
import { AppointmentExtra, AppointmentService } from "@/lib/types";
import { toast } from "sonner";

export function useAppointmentServices() {
  const saveAppointmentServices = async (
    appointmentId: string,
    services: Pick<AppointmentService, "service_id" | "price">[]
  ): Promise<boolean> => {
    try {
      await supabase.from("appointment_services").delete().eq("appointment_id", appointmentId);
      if (services.length === 0) return true;
      const { error } = await supabase.from("appointment_services").insert(
        services.map((s) => ({ appointment_id: appointmentId, service_id: s.service_id, price: s.price }))
      );
      if (error) {
        console.error("saveAppointmentServices:", error);
        toast.error("Erro ao guardar serviços — cria as tabelas no Supabase primeiro");
        return false;
      }
      return true;
    } catch (e) {
      console.error("saveAppointmentServices exception:", e);
      return false;
    }
  };

  const saveAppointmentExtras = async (
    appointmentId: string,
    extras: Pick<AppointmentExtra, "description" | "price">[]
  ): Promise<boolean> => {
    try {
      await supabase.from("appointment_extras").delete().eq("appointment_id", appointmentId);
      const valid = extras.filter((e) => e.description.trim() || e.price > 0);
      if (valid.length === 0) return true;
      const { error } = await supabase.from("appointment_extras").insert(
        valid.map((e) => ({ appointment_id: appointmentId, description: e.description, price: e.price }))
      );
      if (error) {
        console.error("saveAppointmentExtras:", error);
        toast.error("Erro ao guardar extras — cria as tabelas no Supabase primeiro");
        return false;
      }
      return true;
    } catch (e) {
      console.error("saveAppointmentExtras exception:", e);
      return false;
    }
  };

  return { saveAppointmentServices, saveAppointmentExtras };
}
