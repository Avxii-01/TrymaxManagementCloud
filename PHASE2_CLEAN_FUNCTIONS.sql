-- Phase 2: Clean User Access Blocking Functions
-- Using auth.uid() for security and proper error handling

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.block_user_access;
DROP FUNCTION IF EXISTS public.unblock_user_access;
DROP FUNCTION IF EXISTS public.check_user_access;

-- Function to block user access
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
DECLARE
    v_current_user_id UUID;
    v_is_super_director BOOLEAN;
    v_user_exists BOOLEAN;
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
        RAISE EXCEPTION 'Only Super Directors can block users';
    END IF;
    
    -- Check if target user exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'Target user does not exist';
    END IF;
    
    -- Prevent self-blocking
    IF v_current_user_id = p_user_id THEN
        RAISE EXCEPTION 'Cannot block yourself';
    END IF;
    
    -- Block the user
    UPDATE public.profiles
    SET 
        is_blocked = TRUE,
        blocked_at = NOW(),
        blocked_by = v_current_user_id
    WHERE id = p_user_id;
    
    -- Create audit entry
    INSERT INTO public.user_access_audit (
        user_id,
        action_type,
        performed_by,
        reason
    ) VALUES (
        p_user_id,
        'blocked',
        v_current_user_id,
        p_reason
    );
    
    RETURN QUERY SELECT TRUE, 'User blocked successfully'::TEXT;
END;
$$;

-- Function to unblock user access
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
DECLARE
    v_current_user_id UUID;
    v_is_super_director BOOLEAN;
    v_user_exists BOOLEAN;
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
        RAISE EXCEPTION 'Only Super Directors can unblock users';
    END IF;
    
    -- Check if target user exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'Target user does not exist';
    END IF;
    
    -- Unblock the user
    UPDATE public.profiles
    SET 
        is_blocked = FALSE,
        blocked_at = NULL,
        blocked_by = NULL
    WHERE id = p_user_id;
    
    -- Create audit entry
    INSERT INTO public.user_access_audit (
        user_id,
        action_type,
        performed_by,
        reason
    ) VALUES (
        p_user_id,
        'unblocked',
        v_current_user_id,
        p_reason
    );
    
    RETURN QUERY SELECT TRUE, 'User unblocked successfully'::TEXT;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.block_user_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_user_access TO authenticated;
