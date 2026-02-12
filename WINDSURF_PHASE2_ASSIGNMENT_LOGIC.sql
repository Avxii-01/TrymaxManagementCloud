-- =====================================================
-- PHASE 2: UPDATE ASSIGNMENT LOGIC ONLY (WINDSURF SAFE)
-- =====================================================

-- Step 1: Create function to safely update assignment with assigned_at
CREATE OR REPLACE FUNCTION public.update_assignment_with_assigned_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Update assigned_at whenever assignee_id is set
    IF NEW.assignee_id IS NOT NULL AND NEW.assigned_at IS NULL THEN
        NEW.assigned_at := NOW();
    END IF;
    
    -- Update assigned_at whenever assignee_id changes
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
        NEW.assigned_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger to automatically update assigned_at
-- Drop trigger if it exists (PostgreSQL syntax)
DROP TRIGGER IF EXISTS trg_assignments_update_assigned_at ON public.assignments;

-- Create the trigger
CREATE TRIGGER trg_assignments_update_assigned_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_assignment_with_assigned_at();

-- Step 3: Backward compatibility - Set assigned_at for existing assignments
UPDATE public.assignments
SET assigned_at = created_at
WHERE assignee_id IS NOT NULL 
AND assigned_at IS NULL;

-- Step 4: Verification queries
SELECT 
    COUNT(*) as total_assignments,
    COUNT(*) FILTER (WHERE assignee_id IS NOT NULL) as assigned_count,
    COUNT(*) FILTER (WHERE assigned_at IS NOT NULL) as with_assigned_at_count
FROM public.assignments;
