-- Find user by email (replace with actual email)
SELECT 
    u.id as user_id,
    u.email,
    p.name,
    ur.role as current_role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'user@example.com';  -- Replace with actual email

-- Or find user by name (replace with actual name)
SELECT 
    u.id as user_id,
    u.email,
    p.name,
    ur.role as current_role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE p.name ILIKE '%John Doe%';  -- Replace with actual name

-- ============================================================
-- MAIN QUERY: Change user role from employee to director
-- ============================================================

-- Method 1: Update existing role (if user already has a role)
UPDATE public.user_roles 
SET role = 'director' 
WHERE user_id = 'USER_UUID_HERE';  -- Replace with actual user_id

-- Method 2: Insert new role (if user doesn't have a role entry)
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_UUID_HERE', 'director')
ON CONFLICT (user_id) DO UPDATE SET role = 'director';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify the role change
SELECT 
    u.id as user_id,
    u.email,
    p.name,
    ur.role as new_role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.id = 'USER_UUID_HERE';  -- Replace with actual user_id

-- Check all directors in the system
SELECT 
    u.id as user_id,
    u.email,
    p.name,
    ur.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'director';

-- ============================================================
-- BATCH OPERATIONS (Optional)
-- ============================================================

-- Change multiple users to directors (by email)
UPDATE public.user_roles 
SET role = 'director' 
WHERE user_id IN (
    SELECT u.id 
    FROM auth.users u 
    WHERE u.email IN (
        'user1@example.com',  -- Replace with actual emails
        'user2@example.com',
        'user3@example.com'
    )
);

-- Change all employees to directors (USE WITH CAUTION!)
UPDATE public.user_roles 
SET role = 'director' 
WHERE role = 'employee';

-- ============================================================
-- SAFETY CHECKS
-- ============================================================

-- Check current role distribution
SELECT 
    role,
    COUNT(*) as user_count
FROM public.user_roles
GROUP BY role;

-- Check if user exists before changing
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM auth.users WHERE id = 'USER_UUID_HERE') 
        THEN 'User exists'
        ELSE 'User not found'
    END as user_check;

-- Backup current roles before making changes
CREATE TEMPORARY TABLE role_backup AS
SELECT 
    user_id,
    role,
    NOW() as backup_timestamp
FROM public.user_roles;

-- Restore from backup if needed (run only if you made a mistake)
-- UPDATE public.user_roles ur
-- SET role = rb.role
-- FROM role_backup rb
-- WHERE ur.user_id = rb.user_id;
