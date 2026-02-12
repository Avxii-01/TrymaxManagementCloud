-- =====================================================
-- PHASE 1: SAFE DATABASE EXTENSION FOR DAILY REPORTS
-- =====================================================

-- Step 1: Add assigned_at Column (Non-breaking)
-- This adds the ability to track when tasks were assigned vs created
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Step 2: Add index for performance
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_at ON public.assignments(assigned_at);

-- Step 3: Verify column was added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'assignments' 
AND column_name IN ('created_at', 'assigned_at')
ORDER BY ordinal_position;
