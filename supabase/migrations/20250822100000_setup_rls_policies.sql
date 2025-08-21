-- Consolidated RLS policy setup and JWT claims configuration
-- This migration:
-- 1) Drops ALL existing RLS policies in the public schema
-- 2) Defines helper functions: get_my_claim(), is_admin_user()
-- 3) Customizes JWT claims to embed user_role and app_role
-- 4) Rebuilds a minimal, consistent RLS policy set
-- 5) Adds hardened role-change guard and an admin helper to update roles

-- 0) Safety: ensure we are on public schema for unqualified names
SET search_path = public;

-- 1) Drop ALL existing policies across public schema
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 2) Helper functions

-- 2.a) Read a claim from the current JWT
CREATE OR REPLACE FUNCTION public.get_my_claim(claim_name text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> claim_name);
$$;

-- 2.b) Centralized admin check (owner or manager, or legacy ADMIN app_role)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  WITH claims AS (
    SELECT COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb AS jwt
  )
  SELECT
    CASE
      -- No JWT claims typically means service role; treat as admin for checks inside SECURITY DEFINER helpers
      WHEN current_setting('request.jwt.claims', true) IS NULL THEN true
      ELSE (
        (claims.jwt ->> 'user_role') IN ('owner', 'manager')
        OR (claims.jwt ->> 'app_role') = 'ADMIN'
      )
    END
  FROM claims;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_claim(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- 3) Customize JWT claims to embed user_role and app_role from profiles
-- Supabase will merge the object returned here into the base JWT claims
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'user_role', (SELECT user_role::text FROM public.profiles WHERE id = auth.uid()),
    'app_role',  (SELECT role::text      FROM public.profiles WHERE id = auth.uid())
  );
$$;

-- 4) Rebuild consistent RLS policy set
-- Enable RLS on all tables in public and add two policies per table:
-- - Authenticated can read everything
-- - Admins can manage everything
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('schema_migrations')
  ) LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.table_schema, r.table_name);
    -- Read for all authenticated users
    EXECUTE format(
      'CREATE POLICY %L ON %I.%I FOR SELECT TO authenticated USING (true)',
      'Authenticated can read ' || r.table_name,
      r.table_schema, r.table_name
    );
    -- Full manage for admins
    EXECUTE format(
      'CREATE POLICY %L ON %I.%I FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user())',
      'Admins can manage ' || r.table_name,
      r.table_schema, r.table_name
    );
  END LOOP;
END $$;

-- 4.a) Profiles-specific policies: allow users to view/update their own row
-- Note: Admins already have full manage via the generic policy above
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    -- Own read
    EXECUTE 'CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid())';
    -- Own update
    EXECUTE 'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())';
  END IF;
END $$;

-- 5) Harden role changes on profiles and provide an admin helper

-- 5.a) Guard function to prevent non-admin role/user_role changes
CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (no JWT) bypasses guard to allow privileged operations
  IF current_setting('request.jwt.claims', true) IS NULL THEN
    RETURN NEW;
  END IF;

  IF (NEW.user_role IS DISTINCT FROM OLD.user_role) OR (NEW.role IS DISTINCT FROM OLD.role) THEN
    IF NOT public.is_admin_user() THEN
      RAISE EXCEPTION 'Unauthorized role change for profile %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    -- Drop and recreate to ensure single trigger instance
    IF EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'trg_guard_profile_role_change'
    ) THEN
      EXECUTE 'DROP TRIGGER trg_guard_profile_role_change ON public.profiles';
    END IF;

    EXECUTE 'CREATE TRIGGER trg_guard_profile_role_change
             BEFORE UPDATE ON public.profiles
             FOR EACH ROW
             EXECUTE FUNCTION public.guard_profile_role_change()';
  END IF;
END $$;

-- 5.b) Admin helper to create/update a profile's role fields
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id uuid,
  new_user_role user_role,
  new_full_name text DEFAULT NULL,
  new_email     text DEFAULT NULL,
  new_phone     text DEFAULT NULL,
  new_teacher_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Upsert profile with updated role info
  INSERT INTO public.profiles (id, user_role, full_name, email, phone, teacher_id, role, created_at, updated_at)
  VALUES (
    target_user_id,
    new_user_role,
    COALESCE(new_full_name, ''),
    COALESCE(new_email, ''),
    new_phone,
    new_teacher_id,
    'USER'::app_role,
    NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    user_role  = EXCLUDED.user_role,
    full_name  = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email      = COALESCE(EXCLUDED.email,     public.profiles.email),
    phone      = COALESCE(EXCLUDED.phone,     public.profiles.phone),
    teacher_id = EXCLUDED.teacher_id,
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, user_role, text, text, text, uuid) TO authenticated;

-- End of consolidated RLS setup
