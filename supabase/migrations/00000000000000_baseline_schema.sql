-- Baseline schema for the application (authoritative)
-- This file consolidates the minimal, stable schema needed for authentication and profile management

SET search_path = public;

-- Extensions (safe if already installed on Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('owner','manager','space_manager','teacher','read_only');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('ADMIN','USER');
  END IF;
END $$;

-- Minimal teachers table to satisfy FK from profiles
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles table: primary subject of AuthZ/AuthN
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  username text UNIQUE,
  full_name text,
  phone text,
  user_role public.user_role NOT NULL DEFAULT 'space_manager',
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  role public.app_role NOT NULL DEFAULT 'USER',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- RLS will be enabled and policies defined by the dedicated RLS migration

