import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StatusColor = "green" | "yellow" | "red" | "gray";

export interface ArchitectureLayer {
  id: string;
  code: string;
  name: string;
  group: string;
  owner_area: string | null;
  priority: number;
  status: string;
  description: string | null;
}

export interface ArchitectureLayerStatus {
  id: string;
  layer_code: string;
  ui_exists: StatusColor;
  backend_exists: StatusColor;
  route_exists: StatusColor;
  menu_exists: StatusColor;
  data_connected: StatusColor;
  integration_connected: StatusColor;
  health_status: StatusColor;
  expected_route: string | null;
  actual_route: string | null;
  menu_expected: boolean | null;
  menu_found: boolean | null;
  sidebar_present: boolean | null;
  notes: string | null;
  updated_at: string;
}

export interface ArchitectureDataSource {
  id: string;
  layer_code: string;
  source_type: string;
  source_name: string;
  is_connected: boolean;
  notes: string | null;
}

export interface ArchitectureDependency {
  id: string;
  layer_code: string;
  depends_on_layer_code: string;
  dependency_type: string;
  is_critical: boolean;
  notes: string | null;
}

export interface ArchitectureHealthSummary {
  total_layers: number;
  fully_active: number;
  partial: number;
  missing_menu: number;
  missing_route: number;
  missing_ui: number;
  missing_backend: number;
  missing_data: number;
  incomplete_integration: number;
}

export function useArchitectureBoard() {
  const layersQuery = useQuery({
    queryKey: ["architecture", "layers"],
    queryFn: async (): Promise<ArchitectureLayer[]> => {
      const { data, error } = await supabase
        .from("architecture_layers_registry")
        .select("*")
        .order("priority");
      if (error) throw error;
      return (data ?? []) as ArchitectureLayer[];
    },
  });

  const statusQuery = useQuery({
    queryKey: ["architecture", "status"],
    queryFn: async (): Promise<ArchitectureLayerStatus[]> => {
      const { data, error } = await supabase
        .from("architecture_layer_status")
        .select("*");
      if (error) throw error;
      return (data ?? []) as ArchitectureLayerStatus[];
    },
  });

  const sourcesQuery = useQuery({
    queryKey: ["architecture", "data_sources"],
    queryFn: async (): Promise<ArchitectureDataSource[]> => {
      const { data, error } = await supabase
        .from("architecture_layer_data_sources")
        .select("*")
        .order("source_name");
      if (error) throw error;
      return (data ?? []) as ArchitectureDataSource[];
    },
  });

  const depsQuery = useQuery({
    queryKey: ["architecture", "dependencies"],
    queryFn: async (): Promise<ArchitectureDependency[]> => {
      const { data, error } = await supabase
        .from("architecture_layer_dependencies")
        .select("*");
      if (error) throw error;
      return (data ?? []) as ArchitectureDependency[];
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["architecture", "summary"],
    queryFn: async (): Promise<ArchitectureHealthSummary> => {
      const { data, error } = await supabase.rpc("architecture_health_summary");
      if (error) throw error;
      return data as unknown as ArchitectureHealthSummary;
    },
  });

  return {
    layers: layersQuery.data ?? [],
    status: statusQuery.data ?? [],
    sources: sourcesQuery.data ?? [],
    deps: depsQuery.data ?? [],
    summary: summaryQuery.data,
    isLoading:
      layersQuery.isLoading ||
      statusQuery.isLoading ||
      sourcesQuery.isLoading ||
      depsQuery.isLoading,
  };
}
