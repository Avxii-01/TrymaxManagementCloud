-- Quick test to verify broadcast system works
-- Run this in Supabase SQL Editor

-- Test 1: Can we create a simple broadcast manually?
INSERT INTO public.broadcast_messages (
    title,
    message,
    type,
    is_pinned,
    is_active,
    created_by,
    publish_at
) VALUES (
    'Test Broadcast',
    'This is a test message to verify the system works',
    'info',
    false,
    true,
    auth.uid(),
    now()
);

-- Test 2: Can we query broadcasts?
SELECT * FROM public.broadcast_messages WHERE is_active = true;

-- Test 3: Check if your user is a Super Director
SELECT 
    u.id, 
    u.name, 
    u.email, 
    r.is_super_director,
    r.role
FROM public.profiles u 
LEFT JOIN public.user_roles r ON u.id = r.user_id 
WHERE u.email = 'your-email@example.com' -- Replace with your actual email
ORDER BY u.created_at DESC;
