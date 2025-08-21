-- This script provides a complete and idempotent set of read policies for the 'admin' role.

-- Grant SELECT on 'halls'
DROP POLICY IF EXISTS "Allow read access for admins" ON public.halls;
CREATE POLICY "Allow read access for admins" ON public.halls FOR SELECT USING (get_my_claim('user_role') = '"admin"');

-- Grant SELECT on 'students'
DROP POLICY IF EXISTS "Allow read access for admins" ON public.students;
CREATE POLICY "Allow read access for admins" ON public.students FOR SELECT USING (get_my_claim('user_role') = '"admin"');

-- Grant SELECT on 'teachers'
DROP POLICY IF EXISTS "Allow read access for admins" ON public.teachers;
CREATE POLICY "Allow read access for admins" ON public.teachers FOR SELECT USING (get_my_claim('user_role') = '"admin"');

-- Grant SELECT on 'bookings'
DROP POLICY IF EXISTS "Allow read access for admins" ON public.bookings;
CREATE POLICY "Allow read access for admins" ON public.bookings FOR SELECT USING (get_my_claim('user_role') = '"admin"');

-- Grant SELECT on 'subjects'
DROP POLICY IF EXISTS "Allow read access for admins" ON public.subjects;
CREATE POLICY "Allow read access for admins" ON public.subjects FOR SELECT USING (get_my_claim('user_role') = '"admin"');

-- Grant SELECT on 'stages'
DROP POLICY IF EXISTS "Allow read access for admins" ON public.stages;
CREATE POLICY "Allow read access for admins" ON public.stages FOR SELECT USING (get_my_claim('user_role') = '"admin"');

-- Grant SELECT on 'registrations'
DROP POLICY IF EXISTS "Allow read access for admins" ON public.registrations;
CREATE POLICY "Allow read access for admins" ON public.registrations FOR SELECT USING (get_my_claim('user_role') = '"admin"');

-- Grant SELECT on 'payments'
DROP POLICY IF EXISTS "Allow read access for admins" ON public.payments;
CREATE POLICY "Allow read access for admins" ON public.payments FOR SELECT USING (get_my_claim('user_role') = '"admin"');