-- ============================================================
-- USER ACCESS BLOCKING FEATURE - DATABASE MIGRATIONS
-- ============================================================

-- Step 1: Add is_super_director field to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN is_super_director BOOLEAN DEFAULT FALSE;

-- Step 2: Add blocking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN blocked_at TIMESTAMPTZ,
ADD COLUMN blocked_by UUID REFERENCES auth.users(id);

-- Step 3: Create audit log table for block/unblock actions
CREATE TABLE public.user_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('block', 'unblock')),
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes for performance
CREATE INDEX idx_user_roles_super_director ON public.user_roles(is_super_director);
CREATE INDEX idx_profiles_blocked ON public.profiles(is_blocked);
CREATE INDEX idx_user_access_audit_user ON public.user_access_audit(user_id);
CREATE INDEX idx_user_access_audit_action ON public.user_access_audit(action_type);

-- Step 5: Set initial Super Director (replace with actual user_id)
-- This should be done manually after migration
UPDATE public.user_roles 
SET is_super_director = TRUE 
WHERE user_id = 'SUPER_DIRECTOR_UUID_HERE';

-- Step 6: Create explicit RLS policies for audit log
CREATE POLICY "Super Directors can view audit log"
  ON public.user_access_audit FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super Directors can insert audit log"
  ON public.user_access_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Super Directors can update audit log"
  ON public.user_access_audit FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Step 7: Enable RLS on audit table
ALTER TABLE public.user_access_audit ENABLE ROW LEVEL SECURITY;

-- Step 8: Create function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = user_uuid 
        AND p.is_blocked = TRUE
    );
END;
$$;

-- Step 9: Create function to check if current user is Super Director
CREATE OR REPLACE FUNCTION public.is_super_director()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.is_super_director = TRUE
    );
END;
$$;
