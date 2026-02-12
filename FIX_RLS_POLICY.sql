-- Fix the RLS policy to allow authenticated users to read broadcasts
-- The frontend will handle the filtering logic

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Broadcasts - Read Active" ON public.broadcast_messages;

-- Create a simpler policy that allows authenticated users to read broadcasts
CREATE POLICY "Broadcasts - Read Active" ON public.broadcast_messages
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

-- Verify the policy was created correctly
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'broadcast_messages';
