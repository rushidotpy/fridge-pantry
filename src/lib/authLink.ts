import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from './supabase'

const OTP_TYPES: EmailOtpType[] = ['magiclink', 'email', 'signup']

function extractUrl(pasted: string): URL | null {
  // Mail apps wrap long links with line breaks; that truncates the token if we stop at whitespace.
  const compact = pasted.replace(/&amp;/gi, '&').replace(/\s+/g, '')
  const match = compact.match(/https?:\/\/[^<>"']+/i)
  if (!match) return null
  try {
    return new URL(match[0].replace(/[),.;]+$/, ''))
  } catch {
    return null
  }
}

function friendlyAuthError(message: string): string {
  if (/expired|invalid|otp/i.test(message)) {
    return 'That link is no longer valid. Each new email kills every older Sign in link in the same thread — open only the newest message, or set a password in Supabase (Authentication → Users) and sign in with email + password.'
  }
  return message
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
      if (error) last = friendlyAuthError(error.message)
    }
    throw new Error(last)
  }

  if (code) {
    const { data, error } = await supabase().auth.exchangeCodeForSession(code)
    if (error) throw new Error(friendlyAuthError(error.message))
    if (!data.session) throw new Error('That link did not create a session. Request a new email and paste the fresh link.')
    return
  }

  throw new Error('That does not look like a sign-in link. Copy the blue Sign in link from the email.')
}
