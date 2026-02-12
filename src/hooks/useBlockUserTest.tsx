import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

// Simple test hook to debug block button
export function useBlockUserTest() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      console.log("🔍 Block button clicked:", { userId, reason });
      
      try {
        // Test 1: Simple RPC call
        console.log("📞 Making RPC call...");
        const { data, error } = await supabase.rpc('block_user_access', {
          p_user_id: userId,
          p_reason: reason || 'Blocked by administrator'
        });
        
        console.log("📊 RPC Response:", { data, error });
        
        if (error) {
          console.error("❌ RPC Error:", error);
          toast({
            title: "RPC Error",
            description: error.message,
            variant: "destructive",
          });
          throw error;
        }
        
        console.log("✅ RPC Success:", data);
        toast({
          title: "Debug Success",
          description: `RPC call worked: ${JSON.stringify(data)}`,
        });
        
        return data;
        
      } catch (catchError) {
        console.error("🚨 Catch Error:", catchError);
        toast({
          title: "Catch Error",
          description: catchError.message,
          variant: "destructive",
        });
        throw catchError;
      }
    },
    onSuccess: () => {
      console.log("🎉 Block success callback");
      toast({
        title: "User Blocked",
        description: "Block operation completed",
      });
    },
    onError: (error) => {
      console.error("💥 Mutation Error:", error);
      toast({
        title: "Mutation Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
