-- =====================================================
-- PHASE 1: BROADCAST ANNOUNCEMENT SYSTEM - DATABASE DESIGN
-- =====================================================

-- Create broadcast_messages table
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical')),
    is_pinned BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    publish_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_broadcast_active ON public.broadcast_messages(is_active);
CREATE INDEX IF NOT EXISTS idx_broadcast_publish ON public.broadcast_messages(publish_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_expires ON public.broadcast_messages(expires_at);

-- Enable Row Level Security
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Policy 1: Everyone can read active broadcasts
CREATE POLICY "Broadcasts - Read Active" ON public.broadcast_messages
    FOR SELECT USING (
        is_active = true 
        AND publish_at <= now()
        AND (expires_at IS NULL OR expires_at > now())
    );

-- Policy 2: Only Super Directors can insert broadcasts
CREATE POLICY "Broadcasts - Insert" ON public.broadcast_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND is_super_director = true
        )
    );

-- Policy 3: Only Super Directors can update broadcasts
CREATE POLICY "Broadcasts - Update" ON public.broadcast_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND is_super_director = true
        )
    );

-- Policy 4: Only Super Directors can delete broadcasts
CREATE POLICY "Broadcasts - Delete" ON public.broadcast_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND is_super_director = true
        )
    );

-- Grant permissions to authenticated users
GRANT SELECT ON public.broadcast_messages TO authenticated;
GRANT INSERT ON public.broadcast_messages TO authenticated;
GRANT UPDATE ON public.broadcast_messages TO authenticated;
GRANT DELETE ON public.broadcast_messages TO authenticated;
