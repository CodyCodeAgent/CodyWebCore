import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const temporaryRoot = mkdtempSync(join(tmpdir(), 'cody-web-core-protocol-'))
const generatedTs = join(temporaryRoot, 'typescript')
const generatedJson = join(temporaryRoot, 'json')
const targetTs = join(root, 'packages/core/src/protocol/generated')
const targetJson = join(root, 'packages/core/schema/json')

function run(args) {
  execFileSync('codex', args, { cwd: root, stdio: 'inherit' })
}

function replaceDirectory(source, target) {
  const staged = `${target}.next`
  rmSync(staged, { recursive: true, force: true })
  mkdirSync(staged, { recursive: true })
  cpSync(source, staged, { recursive: true })
  rmSync(target, { recursive: true, force: true })
  renameSync(staged, target)
}

try {
  run(['app-server', 'generate-ts', '--experimental', '--out', generatedTs])
  run(['app-server', 'generate-json-schema', '--experimental', '--out', generatedJson])
  replaceDirectory(generatedTs, targetTs)
  replaceDirectory(generatedJson, targetJson)
  const version = execFileSync('codex', ['--version'], { encoding: 'utf8' }).trim()
  writeFileSync(join(root, 'packages/core/schema/CODEX_VERSION'), `${version}\n`)
  process.stdout.write(`Generated protocol snapshots with ${version}\n`)
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true })
}
