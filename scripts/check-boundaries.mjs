import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const coreRoot = join(root, 'packages', 'core', 'src')
const vueRoot = join(root, 'packages', 'vue', 'src')

const allowedCoreDependencies = {
  protocol: new Set(['protocol']),
  runtime: new Set(['runtime', 'protocol']),
  session: new Set(['session', 'runtime', 'protocol', 'conversation']),
  conversation: new Set(['conversation']),
  composer: new Set(['composer']),
  presentation: new Set(['presentation', 'protocol', 'conversation']),
  client: new Set(['client', 'conversation']),
}

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesBelow(path))
    else if (extname(entry.name) === '.ts' && !entry.name.endsWith('.test.ts')) files.push(path)
  }
  return files
}

function sourceLayer(path) {
  return relative(coreRoot, path).split(sep)[0]
}

function importedCoreLayer(path, specifier) {
  if (!specifier.startsWith('.')) return null
  const target = resolve(path, '..', specifier)
  const relativeTarget = relative(coreRoot, target)
  if (relativeTarget.startsWith('..')) return null
  return relativeTarget.split(sep)[0]
}

const failures = []
for (const path of await filesBelow(coreRoot)) {
  const owner = sourceLayer(path)
  const allowed = allowedCoreDependencies[owner]
  if (!allowed) continue
  const source = await readFile(path, 'utf8')
  for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/gu)) {
    const dependency = importedCoreLayer(path, match[1])
    if (dependency && !allowed.has(dependency)) {
      failures.push(`${relative(root, path)}: ${owner} must not import ${dependency}`)
    }
  }
}

for (const path of await filesBelow(vueRoot)) {
  const source = await readFile(path, 'utf8')
  if (/\.\.\/\.\.\/core\/src|packages\/core\/src/gu.test(source)) {
    failures.push(`${relative(root, path)}: Vue must import public Core entrypoints`)
  }
}

if (failures.length > 0) {
  process.stderr.write(`CodyWebCore boundary violations:\n${failures.map((row) => `- ${row}`).join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write('CodyWebCore boundaries are valid.\n')
}
