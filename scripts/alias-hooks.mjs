import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    let rel = specifier.slice(2)
    if (!rel.endsWith('.js') && !rel.endsWith('.mjs') && !rel.endsWith('.json')) {
      rel = `${rel}.js`
    }
    const target = pathToFileURL(path.join(root, rel)).href
    return nextResolve(target, context)
  }
  return nextResolve(specifier, context)
}
