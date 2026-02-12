-- =====================================================
-- PHASE 2: BROADCAST ANNOUNCEMENT SYSTEM - SECURE RPC
-- =====================================================

-- Drop function if exists
DROP FUNCTION IF EXISTS public.create_broadcast;

-- Create secure broadcast function
CREATE OR REPLACE FUNCTION public.create_broadcast(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_is_pinned BOOLEAN DEFAULT false,
    p_publish_at TIMESTAMPTZ DEFAULT now(),
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    broadcast_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
    v_is_super_director BOOLEAN;
    v_broadcast_id UUID;
BEGIN
    -- Get current authenticated user
    v_current_user_id := auth.uid();
    
    -- Check if current user is authenticated
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if current user is Super Director
    SELECT is_super_director INTO v_is_super_director
    FROM public.user_roles 
    WHERE user_id = v_current_user_id;
    
    IF v_is_super_director IS NOT TRUE THEN
        RAISE EXCEPTION 'Only Super Directors can create broadcasts';
    END IF;
    
    -- Validate inputs
    IF p_title IS NULL OR TRIM(p_title) = '' THEN
        RAISE EXCEPTION 'Title is required';
    END IF;
    
    IF p_message IS NULL OR TRIM(p_message) = '' THEN
        RAISE EXCEPTION 'Message is required';
    END IF;
    
    IF LENGTH(TRIM(p_message)) > 500 THEN
        RAISE EXCEPTION 'Message cannot exceed 500 characters';
    END IF;
    
    IF p_type NOT IN ('info', 'warning', 'critical') THEN
        RAISE EXCEPTION 'Invalid broadcast type. Must be info, warning, or critical';
    END IF;
    
    -- Insert broadcast
    INSERT INTO public.broadcast_messages (
        title,
        message,
        type,
        is_pinned,
        publish_at,
        expires_at,
        created_by
    ) VALUES (
        TRIM(p_title),
        TRIM(p_message),
        p_type,
        p_is_pinned,
        COALESCE(p_publish_at, now()),
        p_expires_at,
        v_current_user_id
    ) RETURNING id INTO v_broadcast_id;
    
    -- Return success
    RETURN QUERY SELECT 
        TRUE, 
        'Broadcast created successfully'::TEXT,
        v_broadcast_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_broadcast TO authenticated;
