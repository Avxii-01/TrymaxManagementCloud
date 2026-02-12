import { useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

// Hook for realtime broadcast updates
export function useBroadcastRealtime() {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Subscribe to broadcast changes
    const channel = supabase
      .channel('broadcast_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'broadcast_messages'
        },
        (payload) => {
          console.log('📢 New broadcast inserted:', payload);
          queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'broadcast_messages'
        },
        (payload) => {
          console.log('📢 Broadcast updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'broadcast_messages'
        },
        (payload) => {
          console.log('📢 Broadcast deleted:', payload);
          queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
        }
      );

    channelRef.current = channel;

    // Subscribe
    const subscription = channel.subscribe();

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return channelRef.current;
}
