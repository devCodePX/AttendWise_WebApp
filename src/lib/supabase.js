/**
 * AttendWise Supabase Integration Client
 * 
 * Handles Supabase Auth (Google OAuth & Email/Password) and PostgreSQL RLS queries.
 * Provides fallback to Demo Mode if Supabase environment variables are missing.
 */
import { createClient } from '@supabase/supabase-js';

const CONFIG_STORAGE_KEY = 'attendwise_custom_supabase_config';

const DEFAULT_SUPABASE_URL = 'https://cyipllurnaomoshhurbq.supabase.co';

export function getStoredSupabaseConfig() {
  // Check env vars first
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return { url: envUrl.trim(), anonKey: envKey.trim(), source: 'env' };
  }

  // Check localStorage for user-provided credentials
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.anonKey) {
        return {
          url: (parsed.url || DEFAULT_SUPABASE_URL).trim(),
          anonKey: parsed.anonKey.trim(),
          source: 'storage'
        };
      }
    }
  } catch (e) {
    console.warn('Failed to read Supabase config from storage', e);
  }

  return { url: DEFAULT_SUPABASE_URL, anonKey: '', source: 'none' };
}

let supabaseInstance = null;

export function getSupabaseClient() {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseInstance;
}

export function saveSupabaseConfig(url, anonKey) {
  if (!url || !anonKey) {
    throw new Error('Both Supabase URL and Anon Key are required.');
  }
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
  supabaseInstance = null; // Reset cached client
  return getSupabaseClient();
}

export function clearSupabaseConfig() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  supabaseInstance = null;
}

export function isSupabaseConfigured() {
  const config = getStoredSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

// Authentication Helpers
export async function getGoogleOAuthUrl() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const redirectUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true, // Prevents loading Google login inside the iframe
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
  return data?.url;
}

export async function signInWithGoogle() {
  const url = await getGoogleOAuthUrl();
  if (!url) throw new Error('Could not generate Google authorization URL.');

  // Open the authorization window as a popup to avoid iframe restrictions
  if (typeof window !== 'undefined') {
    const width = 520;
    const height = 650;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const popup = window.open(
      url,
      'AttendWiseGoogleOAuth',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    return { url, popup };
  }

  return { url, popup: null };
}

export async function signInWithEmail(email, password) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) throw error;
  return data;
}

export async function resendConfirmationEmail(email) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured.');

  const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { data, error } = await client.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
}

export async function getCurrentUser() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session ? session.user : null;
}

// Ready-to-execute SQL Migration script for Supabase SQL Editor
export const SQL_MIGRATION_SCRIPT = `-- AttendWise PostgreSQL Database Schema & Security
-- Paste this into your Supabase Dashboard > SQL Editor > Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Semesters Table
CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT semester_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_semesters_user_id ON public.semesters(user_id);

-- 2. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    required_percentage NUMERIC(5,2) NOT NULL DEFAULT 75.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subject_name_not_empty CHECK (char_length(trim(name)) > 0),
    CONSTRAINT required_percentage_range CHECK (required_percentage > 0 AND required_percentage <= 100)
);

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester_id ON public.subjects(semester_id);

-- 3. Attendance Records Table (With CANCELLED status support)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_subject_class_date UNIQUE (subject_id, class_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject_date ON public.attendance_records(subject_id, class_date);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (ensures users can only access their own data)
DROP POLICY IF EXISTS "Users can manage own semesters" ON public.semesters;
CREATE POLICY "Users can manage own semesters"
ON public.semesters FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own subjects" ON public.subjects;
CREATE POLICY "Users can manage own subjects"
ON public.subjects FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own attendance records" ON public.attendance_records;
CREATE POLICY "Users can manage own attendance records"
ON public.attendance_records FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
`;
