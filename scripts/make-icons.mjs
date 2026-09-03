// Renders the SVG favicon into the PNG sizes iOS and the PWA manifest require.
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'icons')
mkdirSync(out, { recursive: true })
const svg = readFileSync(join(out, 'favicon.svg'))

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['apple-touch-icon.png', 180, false],
  ['icon-512-maskable.png', 512, true],
]

for (const [name, size, maskable] of targets) {
  let img = sharp(svg, { density: 384 }).resize(size, size)
  if (maskable) {
    // Maskable icons need ~10% safe padding so OS masks don't clip the artwork.
    const inner = Math.round(size * 0.8)
    img = sharp({
      create: { width: size, height: size, channels: 4, background: '#0f766e' },
    }).composite([
      {
        input: await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer(),
        gravity: 'centre',
      },
    ])
  }
  await img.png().toFile(join(out, name))
  console.log('wrote', name)
}
