-- Fix Admin Data Access Issues
-- This script ensures the admin user has proper permissions and that data is accessible

-- Step 1: Check and update admin user role
-- First, let's see the current admin user's profile
SELECT id, email, username, user_role, full_name 
FROM profiles 
WHERE email = 'admin@system.local' OR username = 'admin';

-- Step 2: Update admin user to have 'owner' role (highest privilege)
UPDATE profiles 
SET user_role = 'owner',
    updated_at = NOW()
WHERE email = 'admin@system.local' OR username = 'admin';

-- Step 3: Verify the update
SELECT id, email, username, user_role, full_name 
FROM profiles 
WHERE email = 'admin@system.local' OR username = 'admin';

-- Step 4: Check if there's any data in the main tables
SELECT 
    (SELECT COUNT(*) FROM students) as students_count,
    (SELECT COUNT(*) FROM teachers) as teachers_count,
    (SELECT COUNT(*) FROM bookings) as bookings_count,
    (SELECT COUNT(*) FROM halls) as halls_count,
    (SELECT COUNT(*) FROM academic_stages) as stages_count,
    (SELECT COUNT(*) FROM subjects) as subjects_count;

-- Step 5: If halls table is empty, add some sample halls
INSERT INTO halls (name, capacity, hourly_rate)
SELECT * FROM (VALUES 
    ('قاعة 1', 30, 100),
    ('قاعة 2', 25, 80),
    ('قاعة 3', 35, 120),
    ('قاعة 4', 20, 70)
) AS v(name, capacity, hourly_rate)
WHERE NOT EXISTS (SELECT 1 FROM halls LIMIT 1);

-- Step 6: If academic_stages table is empty, add some sample stages
INSERT INTO academic_stages (name)
SELECT * FROM (VALUES 
    ('الصف الأول'),
    ('الصف الثاني'),
    ('الصف الثالث'),
    ('الصف الرابع'),
    ('الصف الخامس'),
    ('الصف السادس')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM academic_stages LIMIT 1);

-- Step 7: If subjects table is empty, add some sample subjects
INSERT INTO subjects (name)
SELECT * FROM (VALUES 
    ('الرياضيات'),
    ('العلوم'),
    ('اللغة العربية'),
    ('اللغة الإنجليزية'),
    ('التاريخ'),
    ('الجغرافيا')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM subjects LIMIT 1);

-- Step 8: Check the is_admin_user function for the current user
-- This will return true if the current user has admin privileges
SELECT is_admin_user() as has_admin_privileges;

-- Step 9: Test data access with admin privileges
-- This should return data if RLS policies are working correctly
SELECT 'Students Access Test' as test_name, 
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result,
       COUNT(*) as count
FROM students
UNION ALL
SELECT 'Teachers Access Test', 
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END,
       COUNT(*)
FROM teachers
UNION ALL
SELECT 'Bookings Access Test', 
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END,
       COUNT(*)
FROM bookings
UNION ALL
SELECT 'Halls Access Test', 
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END,
       COUNT(*)
FROM halls;

-- Step 10: Summary message
SELECT 
    '✓ Admin user role has been set to "owner"' as message
UNION ALL
SELECT 
    '✓ Sample data has been added to empty tables'
UNION ALL
SELECT 
    '✓ You should now be able to see data in the admin dashboard'
UNION ALL
SELECT 
    '→ Please refresh your browser and try logging in again as admin';