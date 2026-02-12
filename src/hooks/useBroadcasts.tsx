import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Types
export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  is_pinned: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  publish_at: string;
  expires_at?: string;
}

export interface BroadcastCreateInput {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'critical';
  is_pinned?: boolean;
  publish_at?: string;
  expires_at?: string;
}

// Hook to fetch active broadcasts
export function useBroadcasts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["broadcasts"],
    queryFn: async (): Promise<BroadcastMessage[]> => {
      if (!user) return [];

      console.log("📢 Fetching broadcasts...");

      // Simplified query for debugging
      const { data, error } = await supabase
        .from("broadcast_messages")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching broadcasts:", error);
        throw error;
      }

      console.log("✅ Broadcasts fetched:", data);
      return data as BroadcastMessage[];
    },
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to create broadcast
export function useCreateBroadcast() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BroadcastCreateInput): Promise<BroadcastMessage> => {
      if (!user) throw new Error("Not authenticated");

      console.log("📢 Creating broadcast:", input);

      const { data, error } = await supabase.rpc('create_broadcast' as any, {
        p_title: input.title,
        p_message: input.message,
        p_type: input.type || 'info',
        p_is_pinned: input.is_pinned || false,
        p_publish_at: input.publish_at || new Date().toISOString(),
        p_expires_at: input.expires_at || null
      });

      if (error) {
        console.error("❌ RPC Error:", error);
        throw error;
      }

      console.log("✅ Broadcast created:", data);
      
      // Return success without trying to fetch - let the query invalidation handle it
      if (data && data.length > 0 && data[0].success) {
        // Return a minimal object for the mutation success callback
        return {
          id: data[0].broadcast_id,
          title: input.title,
          message: input.message,
          type: input.type || 'info',
          is_pinned: input.is_pinned || false,
          is_active: true,
          created_by: user.id,
          created_at: new Date().toISOString(),
          publish_at: input.publish_at || new Date().toISOString(),
          expires_at: input.expires_at || null
        } as BroadcastMessage;
      }

      throw new Error("Failed to create broadcast");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast({
        title: "Broadcast Created",
        description: "Your announcement has been published successfully.",
      });
    },
    onError: (error) => {
      console.error("❌ Broadcast creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create broadcast",
        variant: "destructive",
      });
    },
  });
}

// Hook to update broadcast
export function useUpdateBroadcast() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BroadcastMessage> }): Promise<BroadcastMessage> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("broadcast_messages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as BroadcastMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast({
        title: "Broadcast Updated",
        description: "Your announcement has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update broadcast",
        variant: "destructive",
      });
    },
  });
}

// Hook to delete broadcast
export function useDeleteBroadcast() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("broadcast_messages")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast({
        title: "Broadcast Deleted",
        description: "Your announcement has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete broadcast",
        variant: "destructive",
      });
    },
  });
}
