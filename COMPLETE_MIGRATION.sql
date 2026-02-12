-- ============================================================
-- USER ACCESS BLOCKING - COMPLETE MIGRATION SCRIPT
-- ============================================================
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR

-- Step 1: Add Super Director field to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS is_super_director BOOLEAN DEFAULT FALSE;

-- Step 2: Add blocking fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id);

-- Step 3: Create audit table
CREATE TABLE IF NOT EXISTS public.user_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('block', 'unblock')),
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_super_director ON public.user_roles(is_super_director);
CREATE INDEX IF NOT EXISTS idx_profiles_blocked ON public.profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_user_access_audit_user ON public.user_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_audit_action ON public.user_access_audit(action_type);

-- Step 5: Create security functions
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
    -- Verify performer is authenticated user
    IF NOT EXISTS (SELECT 1 FROM auth.sessions WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Prevent self-blocking
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot block yourself';
    END IF;
    
    -- Check if user is Super Director
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND is_super_director = TRUE
    ) THEN
        RAISE EXCEPTION 'Only Super Directors can block users';
    END IF;
    
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
    
    RETURN QUERY SELECT TRUE, 'User blocked successfully'::TEXT;
END;
$$;

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
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Check if user is Super Director
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND is_super_director = TRUE
    ) THEN
        RAISE EXCEPTION 'Only Super Directors can unblock users';
    END IF;
    
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

-- Step 6: Create RLS policies
DROP POLICY IF EXISTS "Super Directors can view audit log" ON public.user_access_audit;
CREATE POLICY "Super Directors can view audit log"
  ON public.user_access_audit FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Super Directors can insert audit log" ON public.user_access_audit;
CREATE POLICY "Super Directors can insert audit log"
  ON public.user_access_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Super Directors can update audit log" ON public.user_access_audit;
CREATE POLICY "Super Directors can update audit log"
  ON public.user_access_audit FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Step 7: Enable RLS
ALTER TABLE public.user_access_audit ENABLE ROW LEVEL SECURITY;

-- Step 8: Set initial Super Director (replace with actual UUID)
-- UNCOMMENT AND REPLACE AFTER RUNNING THE ABOVE:
-- UPDATE public.user_roles 
-- SET is_super_director = TRUE 
-- WHERE user_id = 'REPLACE_WITH_ACTUAL_SUPER_DIRECTOR_UUID';

-- Step 9: Verification queries
SELECT 'Migration completed successfully!' as status;
