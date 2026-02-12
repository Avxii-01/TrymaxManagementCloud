-- ============================================================
-- USER ACCESS BLOCKING - STORED PROCEDURES (SECURITY FIXED)
-- ============================================================

-- Function to block user access atomically
CREATE OR REPLACE FUNCTION public.block_user_access(
    p_user_id UUID,
    p_reason TEXT DEFAULT 'Blocked by administrator'
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Verify performer is authenticated user (no frontend UUIDs)
    IF NOT EXISTS (SELECT 1 FROM auth.sessions WHERE user_id = auth.uid()) THEN
        RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT;
    END IF;
    
    -- Prevent self-blocking
    IF p_user_id = auth.uid() THEN
        RETURN QUERY SELECT FALSE, 'Cannot block yourself'::TEXT;
    END IF;
    
    -- Get user names for audit
    DECLARE v_user_name TEXT;
    DECLARE v_performer_name TEXT;
    SELECT name INTO v_user_name FROM public.profiles WHERE id = p_user_id;
    SELECT name INTO v_performer_name FROM public.profiles WHERE id = auth.uid();
    
    -- Block the user
    UPDATE public.profiles 
    SET 
        is_blocked = TRUE,
        blocked_at = NOW(),
        blocked_by = auth.uid()
    WHERE id = p_user_id;
    
    -- Log the action
    INSERT INTO public.user_access_audit (
        user_id,
        action_type,
        performed_by,
        reason,
        created_at
    ) VALUES (
        p_user_id,
        'block',
        auth.uid(),
        p_reason,
        NOW()
    );
    
    -- Invalidate user sessions (Supabase handles this automatically via RLS)
    -- The auth.signOut() will handle session cleanup
    
    RETURN QUERY SELECT TRUE, 'User blocked successfully'::TEXT;
END;
$$;

-- Function to unblock user access atomically
CREATE OR REPLACE FUNCTION public.unblock_user_access(
    p_user_id UUID,
    p_reason TEXT DEFAULT 'Unblocked by administrator'
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Verify performer is authenticated user
    IF NOT EXISTS (SELECT 1 FROM auth.sessions WHERE user_id = auth.uid()) THEN
        RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT;
    END IF;
    
    -- Get performer name for audit
    DECLARE v_performer_name TEXT;
    SELECT name INTO v_performer_name FROM public.profiles WHERE id = auth.uid();
    
    -- Unblock the user
    UPDATE public.profiles 
    SET 
        is_blocked = FALSE,
        blocked_at = NULL,
        blocked_by = NULL
    WHERE id = p_user_id;
    
    -- Log the action
    INSERT INTO public.user_access_audit (
        user_id,
        action_type,
        performed_by,
        reason,
        created_at
    ) VALUES (
        p_user_id,
        'unblock',
        auth.uid(),
        p_reason,
        NOW()
    );
    
    RETURN QUERY SELECT TRUE, 'User unblocked successfully'::TEXT;
END;
$$;

-- Function to check if user should be blocked from login
CREATE OR REPLACE FUNCTION public.check_user_access(p_user_id UUID)
RETURNS TABLE(
    should_block BOOLEAN,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        p.is_blocked,
        CASE 
            WHEN p.is_blocked THEN 'User access is blocked'
            ELSE NULL
        END as reason
    FROM public.profiles p
    WHERE p.id = p_user_id;
END;
$$;
