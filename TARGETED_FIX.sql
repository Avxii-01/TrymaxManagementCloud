-- Targeted fix for User Access Blocking based on actual database schema
-- This adds missing columns and fixes RPC functions to match your structure

-- Step 1: Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_by UUID;

-- Step 1.5: Add is_super_director column to user_roles for selective access control
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS is_super_director BOOLEAN DEFAULT FALSE;

-- Step 2: Fix user_access_audit table structure
-- Drop and recreate with correct columns
DROP TABLE IF EXISTS public.user_access_audit;

CREATE TABLE public.user_access_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('blocked', 'unblocked')),
    performed_by UUID NOT NULL REFERENCES public.profiles(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Update RPC functions to match actual schema
DROP FUNCTION IF EXISTS public.block_user_access;
DROP FUNCTION IF EXISTS public.unblock_user_access;

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
    
    -- Check if current user is Super Director (is_super_director = true)
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
    
    -- Check if current user is Super Director (is_super_director = true)
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

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.block_user_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_user_access TO authenticated;

-- Step 5: Enable RLS on audit table
ALTER TABLE public.user_access_audit ENABLE ROW LEVEL SECURITY;

-- Create policy for audit table
CREATE POLICY "Users can view audit log" ON public.user_access_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'director'
        )
    );

-- Step 6: Add check_user_access function for login prevention
CREATE OR REPLACE FUNCTION public.check_user_access(
    p_user_id UUID
)
RETURNS TABLE(
    should_block BOOLEAN,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_is_blocked BOOLEAN;
BEGIN
    -- Check if user is blocked
    SELECT is_blocked INTO v_is_blocked
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Return result
    RETURN QUERY SELECT 
        v_is_blocked as should_block,
        CASE 
            WHEN v_is_blocked THEN 'User account is blocked'
            ELSE NULL
        END as reason;
END;
$$;

-- Grant permission for authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_access TO authenticated;

-- Step 7: Update frontend hooks to match schema
-- (This will be handled in the next step)

-- Step 7: Instructions for making selective Super Directors
-- After running this script, use these commands to make specific Directors into Super Directors:

-- 1. View all current Directors
SELECT u.id, u.name, u.email, r.role, r.is_super_director 
FROM public.profiles u 
LEFT JOIN public.user_roles r ON u.id = r.user_id 
WHERE r.role = 'director';

-- 2. Make specific Directors into Super Directors (replace USER_ID_HERE with actual user IDs)
UPDATE public.user_roles 
SET is_super_director = TRUE 
WHERE user_id = 'USER_ID_HERE'; -- Replace with actual user ID

-- Example: Make two specific users Super Directors
-- UPDATE public.user_roles SET is_super_director = TRUE WHERE user_id = 'user-id-1';
-- UPDATE public.user_roles SET is_super_director = TRUE WHERE user_id = 'user-id-2';

-- 3. Verify Super Directors
SELECT u.id, u.name, u.email, r.role, r.is_super_director 
FROM public.profiles u 
LEFT JOIN public.user_roles r ON u.id = r.user_id 
WHERE r.is_super_director = TRUE;
