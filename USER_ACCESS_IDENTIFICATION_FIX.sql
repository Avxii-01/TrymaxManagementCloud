-- =====================================================
-- USER ACCESS CONTROL - IDENTIFICATION ISSUE FIX
-- =====================================================

-- Problem: When blocking one user, both users with similar names get blocked
-- Root Cause: Frontend might be selecting wrong user ID

-- Step 1: Check current users and their IDs
SELECT 
    p.id as user_id,
    p.name,
    p.email,
    p.is_blocked,
    ur.is_super_director,
    pr.created_at as profile_created
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
LEFT JOIN public.user_access_audit pr ON p.id = pr.user_id AND pr.action_type = 'blocked'
ORDER BY p.name, p.email;

-- Step 2: Check if there are duplicate names
SELECT 
    name,
    COUNT(*) as name_count,
    STRING_AGG(email, ', ') as emails,
    STRING_AGG(id::text, ', ') as user_ids
FROM public.profiles 
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY name_count DESC;

-- Step 3: Check recent blocking actions
SELECT 
    p.name as blocked_user_name,
    p.email as blocked_user_email,
    pr.action_type,
    pr.reason,
    pr.created_at as blocked_at,
    admin.name as blocked_by_name,
    admin.email as blocked_by_email
FROM public.user_access_audit pr
JOIN public.profiles p ON pr.user_id = p.id
JOIN public.profiles admin ON pr.performed_by = admin.id
WHERE pr.created_at >= NOW() - INTERVAL '1 day'
ORDER BY pr.created_at DESC
LIMIT 10;
