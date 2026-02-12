-- =====================================================
-- PHASE 4: UPDATE DAILY REPORT LOGIC (WINDSURF SAFE)
-- =====================================================

-- Step 1: Update useDailySummaryData hook to use assigned_at for "Tasks Assigned Today"
-- This changes the filter logic without breaking existing functionality

-- Current logic:
-- Tasks Created Today: created_at >= startOfToday
-- Tasks Assigned Today: assigned_at >= startOfToday (NEW)

-- Step 2: Add new query function for assigned tasks
CREATE OR REPLACE FUNCTION public.get_assigned_tasks_count(p_user_id UUID, p_date DATE)
RETURNS INTEGER AS $$
DECLARE
    task_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO task_count
    FROM public.assignments
    WHERE assignee_id = p_user_id
    AND DATE(assigned_at) = p_date;
    
    RETURN COALESCE(task_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Add new query function for created tasks
CREATE OR REPLACE FUNCTION public.get_created_tasks_count(p_user_id UUID, p_date DATE)
RETURNS INTEGER AS $$
DECLARE
    task_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO task_count
    FROM public.assignments
    WHERE assignee_id = p_user_id
    AND DATE(created_at) = p_date;
    
    RETURN COALESCE(task_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Step 4: Verification queries
-- Test the new functions
SELECT 
    get_created_tasks_count('your-user-id-here', CURRENT_DATE) as created_today,
    get_assigned_tasks_count('your-user-id-here', CURRENT_DATE) as assigned_today;
