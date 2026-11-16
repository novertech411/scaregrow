import { createClient } from '@/lib/supabase/client'
import { withBase } from '@/lib/base-path'

export async function signIn(email: string, password: string) {
  const { data, error } = await createClient().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await createClient().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}${withBase('/auth/callback')}`,
    },
  })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  // OAuth redirects before provider errors can reach the caller's catch block.
  // Check public Auth settings first so unavailable Google stays on the form.
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error('Unable to connect to Google sign-in. Please try again.')
  }
  const settings = await response.json()
  if (!settings.external?.google) {
    throw new Error('Google sign-in is currently unavailable. Please use your email and password.')
  }

  const { data, error } = await createClient().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${withBase('/auth/callback')}`,
    },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await createClient().auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await createClient().auth.getSession()
  if (error) throw error
  return data.session
}

export async function getUser() {
  const { data, error } = await createClient().auth.getUser()
  if (error) throw error
  return data.user
}
