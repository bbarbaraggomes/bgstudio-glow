import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Client } from "@/lib/types";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");
    if (error) {
      toast.error("Erro ao carregar clientes");
    } else {
      setClients(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = async (data: Omit<Client, "id" | "created_at">) => {
    const { error } = await supabase.from("clients").insert([data]);
    if (error) { toast.error("Erro ao criar cliente"); return false; }
    await fetchClients();
    return true;
  };

  const updateClient = async (id: string, data: Partial<Omit<Client, "id" | "created_at">>) => {
    const { error } = await supabase.from("clients").update(data).eq("id", id);
    if (error) { toast.error("Erro ao atualizar cliente"); return false; }
    await fetchClients();
    return true;
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover cliente"); return false; }
    await fetchClients();
    return true;
  };

  return { clients, loading, fetchClients, createClient, updateClient, deleteClient };
}
