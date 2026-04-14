import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useProjects(filters?: { status?: string }) {
  return useQuery({
    queryKey: ["prj-projects", filters],
    queryFn: async () => {
      let q = supabase
        .from("prj_projects")
        .select("*, clients(name), fin_cost_centers(name)")
        .order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("prj_projects").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prj-projects"] }); toast.success("Projeto criado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("prj_projects").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prj-projects"] }); toast.success("Projeto atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prj_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prj-projects"] }); toast.success("Projeto excluído"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useProjectPhases(projectId?: string) {
  return useQuery({
    queryKey: ["prj-phases", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prj_phases")
        .select("*")
        .eq("project_id", projectId!)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

export function useCreatePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("prj_phases").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prj-phases"] }); toast.success("Etapa criada"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useProjectPlannedResources(projectId?: string) {
  return useQuery({
    queryKey: ["prj-planned-resources", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prj_planned_resources")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

export function useCreatePlannedResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("prj_planned_resources").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prj-planned-resources"] }); toast.success("Recurso planejado"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useProjectExecutionLogs(projectId?: string) {
  return useQuery({
    queryKey: ["prj-execution-logs", projectId],
    queryFn: async () => {
      let q = supabase
        .from("prj_execution_logs")
        .select("*, hr_employees(name), ops_orders(title, order_number)")
        .order("work_date", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId || projectId === undefined,
  });
}

export function useCreateExecutionLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("prj_execution_logs").insert(values);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prj-execution-logs"] }); toast.success("Registro salvo"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useProjectScopeChanges(projectId?: string) {
  return useQuery({
    queryKey: ["prj-scope-changes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prj_scope_changes")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}
