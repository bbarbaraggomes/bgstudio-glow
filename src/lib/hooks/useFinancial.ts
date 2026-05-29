import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { FinancialRecord } from "@/lib/types";

export function useFinancial(month?: string) {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("financial_records")
      .select("*, services(name_pt)")
      .order("date", { ascending: false });

    if (month) {
      const [year, m] = month.split("-").map(Number);
      const lastDay = new Date(year, m, 0).getDate();
      query = query
        .gte("date", `${month}-01`)
        .lte("date", `${month}-${String(lastDay).padStart(2, "0")}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      setError("Erro ao carregar registos financeiros");
      toast.error("Erro ao carregar registos financeiros");
    } else {
      setError(null);
      setRecords((data as FinancialRecord[]) ?? []);
    }
    setLoading(false);
  }, [month]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const createRecord = async (data: Omit<FinancialRecord, "id" | "created_at" | "services">) => {
    const { error } = await supabase.from("financial_records").insert([data]);
    if (error) { console.error(error); toast.error("Erro ao criar lançamento"); return false; }
    await fetchRecords();
    return true;
  };

  const deleteRecord = async (id: string) => {
    const { error } = await supabase.from("financial_records").delete().eq("id", id);
    if (error) { console.error(error); toast.error("Erro ao remover lançamento"); return false; }
    await fetchRecords();
    return true;
  };

  return { records, loading, error, fetchRecords, createRecord, deleteRecord };
}
