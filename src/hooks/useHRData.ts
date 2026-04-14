import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Employees ──
export function useHREmployees() {
  return useQuery({
    queryKey: ["hr-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_employees")
        .select("*, hr_departments(name), hr_positions(title), hr_teams(name)")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("hr_employees").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-employees"] }); toast.success("Colaborador cadastrado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("hr_employees").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-employees"] }); toast.success("Colaborador atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-employees"] }); toast.success("Colaborador excluído"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Departments ──
export function useHRDepartments() {
  return useQuery({
    queryKey: ["hr-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_departments")
        .select("*, fin_cost_centers(name)")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("hr_departments").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-departments"] }); toast.success("Departamento criado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Teams ──
export function useHRTeams() {
  return useQuery({
    queryKey: ["hr-teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_teams")
        .select("*, hr_departments(name)")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("hr_teams").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-teams"] }); toast.success("Equipe criada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Positions ──
export function useHRPositions() {
  return useQuery({
    queryKey: ["hr-positions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_positions").select("*").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("hr_positions").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-positions"] }); toast.success("Cargo criado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Timesheets ──
export function useHRTimesheets(month?: string) {
  return useQuery({
    queryKey: ["hr-timesheets", month],
    queryFn: async () => {
      let q = supabase
        .from("hr_timesheets")
        .select("*, hr_employees(name)")
        .order("work_date", { ascending: false });
      if (month) {
        q = q.gte("work_date", `${month}-01`).lte("work_date", `${month}-31`);
      }
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("hr_timesheets").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-timesheets"] }); toast.success("Jornada registrada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useApproveTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_timesheets").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-timesheets"] }); toast.success("Jornada aprovada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Labor Allocations ──
export function useHRLaborAllocations(month?: string) {
  return useQuery({
    queryKey: ["hr-labor-allocations", month],
    queryFn: async () => {
      let q = supabase
        .from("hr_labor_allocations")
        .select("*, hr_employees(name, hourly_cost), fin_cost_centers(name)")
        .order("reference_month", { ascending: false });
      if (month) {
        q = q.eq("reference_month", `${month}-01`);
      }
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateLaborAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("hr_labor_allocations").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-labor-allocations"] }); toast.success("Rateio registrado"); },
    onError: (e: any) => toast.error(e.message),
  });
}
