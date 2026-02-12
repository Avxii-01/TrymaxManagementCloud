-- =====================================================
-- PHASE 3: BACKWARD COMPATIBILITY (WINDSURF SAFE)
-- =====================================================

-- Optional: Set assigned_at for existing assignments
-- Only run this if you want to backfill data
-- Uncomment and run manually if needed

/*
UPDATE public.assignments
SET assigned_at = created_at
WHERE assignee_id IS NOT NULL 
AND assigned_at IS NULL;
*/

-- Verification query to check results
SELECT 
    COUNT(*) as total_assignments,
    COUNT(*) FILTER (WHERE assigned_at IS NOT NULL) as with_assigned_at_count,
    COUNT(*) FILTER (WHERE assigned_at IS NULL AND assignee_id IS NOT NULL) as missing_assigned_at_count
FROM public.assignments;
