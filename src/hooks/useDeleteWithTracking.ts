import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

interface DeleteTrackingParams {
  table: string;
  id: string;
  data: Json;
  type: string;
  identifier: string;
  reason?: string;
}

export const useDeleteWithTracking = () => {
  const { toast } = useToast();

  const logDeletion = async ({
    table,
    id,
    data,
    type,
    identifier,
    reason
  }: DeleteTrackingParams): Promise<string | null> => {
    try {
      const { data: result, error } = await supabase.rpc('log_deletion', {
        p_table: table,
        p_id: id,
        p_data: data,
        p_type: type,
        p_identifier: identifier,
        p_reason: reason || null
      });

      if (error) {
        console.error('Error logging deletion:', error);
        return null;
      }

      return result as string;
    } catch (error) {
      console.error('Error in logDeletion:', error);
      return null;
    }
  };

  const deleteWithTracking = async <T extends { id: string }>(
    table: string,
    record: T,
    type: string,
    identifier: string,
    reason?: string
  ): Promise<boolean> => {
    try {
      // First, log the deletion
      await logDeletion({
        table,
        id: record.id,
        data: record as unknown as Json,
        type,
        identifier,
        reason
      });

      // Then perform the actual deletion
      const { error } = await supabase
        .from(table as 'deleted_records')
        .delete()
        .eq('id', record.id);

      if (error) {
        toast({
          title: "Erro ao excluir",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteWithTracking:', error);
      return false;
    }
  };

  return { logDeletion, deleteWithTracking };
};
