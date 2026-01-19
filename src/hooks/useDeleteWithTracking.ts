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
      // Get current user info
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      let userName: string | null = null;
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username, email')
          .eq('id', userId)
          .single();
        
        userName = profile?.full_name || profile?.username || profile?.email || null;
      }

      // Insert directly into deleted_records table
      const { data: result, error } = await supabase
        .from('deleted_records')
        .insert({
          original_table: table,
          original_id: id,
          original_data: data,
          deleted_by: userId || null,
          deleted_by_name: userName,
          deletion_reason: reason || null,
          record_type: type,
          record_identifier: identifier
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error logging deletion:', error);
        return null;
      }

      return result?.id || null;
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
