import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i <= 0) continue
  const k = t.slice(0, i).trim()
  if (!process.env[k]) process.env[k] = t.slice(i + 1).trim()
}

const { clerkPublishableKey, clerkSecretKey, clerkKeysMatch, isClerkConfigured } = await import('../lib/clerk-config.js')
const pk = clerkPublishableKey()
const sk = clerkSecretKey()
console.log('configured:', isClerkConfigured())
console.log('keys match:', clerkKeysMatch(pk, sk))
if (pk && sk) {
  const pkD = Buffer.from(pk.replace(/^pk_(test|live)_/, ''), 'base64').toString('utf8')
  const skD = Buffer.from(sk.replace(/^sk_(test|live)_/, ''), 'base64').toString('utf8')
  console.log('pk instance:', pkD.split('$')[0])
  console.log('sk instance:', skD.split('$')[0])
}
