import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from './supabase'

const OTP_TYPES: EmailOtpType[] = ['magiclink', 'email', 'signup']

function extractUrl(pasted: string): URL | null {
  const match = pasted.match(/https?:\/\/[^\s<>"']+/i)
  if (!match) return null
  try {
    return new URL(match[0].replace(/[),.;]+$/, ''))
  } catch {
    return null
  }
}

/** Complete a magic-link sign-in inside this app. Never navigate to supabase.co (that opens Safari on iPhone). */
export async function signInWithPastedLink(pasted: string): Promise<void> {
  const url = extractUrl(pasted)
  if (!url) throw new Error('Paste the full Sign in link from the email.')

  const tokenHash = url.searchParams.get('token_hash') ?? url.searchParams.get('token')
  const hinted = (url.searchParams.get('type') ?? 'magiclink') as EmailOtpType
  const code = url.searchParams.get('code')

  if (tokenHash) {
    const types = [hinted, ...OTP_TYPES.filter((t) => t !== hinted)]
    let last = 'Could not verify that link.'
    for (const type of types) {
      const { data, error } = await supabase().auth.verifyOtp({ token_hash: tokenHash, type })
      if (!error && data.session) return
      if (error) last = error.message
    }
    throw new Error(last)
  }

  if (code) {
    const { data, error } = await supabase().auth.exchangeCodeForSession(code)
    if (error) throw error
    if (!data.session) throw new Error('That link did not create a session. Request a new email and paste the fresh link.')
    return
  }

  throw new Error('That does not look like a sign-in link. Copy the blue Sign in link from the email.')
}
