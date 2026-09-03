// Generates VAPID keys for web push.
//   VAPID_KEYS            -> Supabase secret (JSON with both JWKs)
//   VITE_VAPID_PUBLIC_KEY -> GitHub Actions secret / .env (base64url public key)
import { webcrypto } from 'node:crypto'

const { subtle } = webcrypto
const keys = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const publicKey = await subtle.exportKey('jwk', keys.publicKey)
const privateKey = await subtle.exportKey('jwk', keys.privateKey)
const raw = Buffer.from(await subtle.exportKey('raw', keys.publicKey))
const appServerKey = raw.toString('base64url')

console.log('VAPID_KEYS (Supabase secret, keep private):')
console.log(JSON.stringify({ publicKey, privateKey }))
console.log('\nVITE_VAPID_PUBLIC_KEY (safe to publish):')
console.log(appServerKey)
