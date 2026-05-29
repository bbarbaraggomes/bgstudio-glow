import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Service } from "@/lib/types";

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("category")
      .order("name_pt");
    if (error) {
      console.error(error);
      setError("Erro ao carregar serviços");
      toast.error("Erro ao carregar serviços");
    } else {
      setError(null);
      setServices(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const createService = async (data: Omit<Service, "id" | "created_at">) => {
    const { error } = await supabase.from("services").insert([data]);
    if (error) { console.error(error); toast.error("Erro ao criar serviço"); return false; }
    await fetchServices();
    return true;
  };

  const updateService = async (id: string, data: Partial<Omit<Service, "id" | "created_at">>) => {
    const { error } = await supabase.from("services").update(data).eq("id", id);
    if (error) { console.error(error); toast.error("Erro ao atualizar serviço"); return false; }
    await fetchServices();
    return true;
  };

  const deleteService = async (id: string) => {
    // Soft delete — preserva integridade referencial com agendamentos
    const { error } = await supabase.from("services").update({ active: false }).eq("id", id);
    if (error) { console.error(error); toast.error("Erro ao remover serviço"); return false; }
    await fetchServices();
    return true;
  };

  const activeServices = services.filter((s) => s.active);

  return { services, activeServices, loading, error, fetchServices, createService, updateService, deleteService };
}
