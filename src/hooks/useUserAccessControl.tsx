import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  is_blocked: boolean;
  user_roles?: {
    is_super_director: boolean;
  };
}

export interface UserAccessAudit {
  id: string;
  user_id: string;
  action_type: string;
  performed_by: string;
  created_at: string;
}

// Hook to check if current user is Super Director
export function useIsSuperDirector() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-super-director", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("is_super_director")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error checking Super Director status:", error);
        return false;
      }

      return data?.is_super_director || false;
    },
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// Hook to get users with access status (simple query, no joins)
export function useUsersWithAccessStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["users-with-access-status"],
    queryFn: async () => {
      if (!user) return [];

      // Get basic user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email, is_blocked");

      if (profilesError) throw profilesError;

      // Get user roles separately
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, is_super_director");

      if (rolesError) throw rolesError;

      // Combine data in frontend
      const users: UserProfile[] = profiles?.map(profile => ({
        ...profile,
        user_roles: roles?.find(role => role.user_id === profile.id)
      })) || [];

      return users;
    },
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// Hook to get audit log
export function useAccessAuditLog() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["access-audit-log"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_access_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as UserAccessAudit[];
    },
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// Hook to block user
export function useBlockUser() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      if (!user) throw new Error("Not authenticated");

      console.log("🚀 Calling block_user_access RPC with:", { userId, reason });

      const { data, error } = await supabase.rpc('block_user_access' as any, {
        p_user_id: userId,
        p_reason: reason || 'Blocked by administrator'
      });

      if (error) {
        console.error("❌ RPC Error:", error);
        throw error;
      }

      console.log("✅ RPC Success:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-access-status"] });
      queryClient.invalidateQueries({ queryKey: ["access-audit-log"] });
      toast({
        title: "User Blocked",
        description: "User has been blocked successfully.",
      });
    },
    onError: (error) => {
      console.error("❌ Mutation Error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to unblock user
export function useUnblockUser() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      if (!user) throw new Error("Not authenticated");

      console.log("🚀 Calling unblock_user_access RPC with:", { userId, reason });

      const { data, error } = await supabase.rpc('unblock_user_access' as any, {
        p_user_id: userId,
        p_reason: reason || 'Unblocked by administrator'
      });

      if (error) {
        console.error("❌ RPC Error:", error);
        throw error;
      }

      console.log("✅ RPC Success:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-access-status"] });
      queryClient.invalidateQueries({ queryKey: ["access-audit-log"] });
      toast({
        title: "User Unblocked",
        description: "User has been unblocked successfully.",
      });
    },
    onError: (error) => {
      console.error("❌ Mutation Error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
