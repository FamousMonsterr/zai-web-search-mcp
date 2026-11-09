// Installer for @local/zai-web-search-mcp into the local DeepSeek Harness (dsh)
// desktop profile. Run via install.ps1, or directly with the dsh runtime node:
//   node.exe scripts/install.mjs --plugin <repo path> --dsh-home <dsh home>
//
// Steps (all idempotent):
//   1. Wire profiles/desktop/package.json: add the bundle id + link: dependency.
//   2. Check ZAI_API_KEY in $DSH_HOME/.credentials.yaml (report, never print it).
//   3. Run pnpm install in the profile dir (link deps only; no registry needed).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import readline from 'node:readline'

const args = process.argv.slice(2)
function arg(name, fallback) {
  const i = args.indexOf(name)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}
const BUNDLE = '@local/zai-web-search-mcp'

const pluginPath = path.resolve(arg('--plugin', process.cwd()))
const dshHome = path.resolve(arg('--dsh-home', process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME, '.dsh')))
const profileDir = path.join(dshHome, 'profiles', 'desktop')
const runtimeDir = path.join(dshHome, 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies')
const pnpmCjs = path.join(runtimeDir, 'pnpm', 'bin', 'pnpm.cjs')
const nodeExe = process.execPath

console.log('plugin :', pluginPath)
console.log('dsh    :', dshHome)

for (const p of [path.join(pluginPath, 'index.js'), profileDir, pnpmCjs]) {
  if (!fs.existsSync(p)) {
    console.error('ERROR: required path missing:', p)
    console.error('       Install DeepSeek Harness desktop and run it once, then retry.')
    process.exit(1)
  }
}

// --- 1. package.json surgery -------------------------------------------------
const pkgPath = path.join(profileDir, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
pkg.dsh ??= {}
pkg.dsh.profile ??= {}
if (!Array.isArray(pkg.dsh.profile.bundles)) pkg.dsh.profile.bundles = []
if (!pkg.dsh.profile.bundles.includes(BUNDLE)) pkg.dsh.profile.bundles.push(BUNDLE)
pkg.dependencies ??= {}
const linkTarget = 'link:' + pluginPath.split(path.sep).join('/')
if (pkg.dependencies[BUNDLE] !== linkTarget) pkg.dependencies[BUNDLE] = linkTarget
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log('OK     : package.json wired (bundle + ' + linkTarget + ')')

// --- 2. credential check ------------------------------------------------------
const credPath = path.join(dshHome, '.credentials.yaml')
let keyConfigured = false
if (fs.existsSync(credPath)) {
  const yaml = fs.readFileSync(credPath, 'utf8')
  keyConfigured = /^\s*ZAI_API_KEY:\s*\S+/m.test(yaml)
}
if (!keyConfigured) {
  const fromEnv = process.env.ZAI_API_KEY && process.env.ZAI_API_KEY.trim()
  if (fromEnv) {
    // append the ref under the existing refs: block (or create the section)
    let yaml = fs.existsSync(credPath) ? fs.readFileSync(credPath, 'utf8') : ''
    if (!/^refs:/m.test(yaml)) yaml = yaml.trimEnd() + '\nrefs:\n'
    yaml = yaml.trimEnd() + '\n  ZAI_API_KEY: ' + fromEnv.trim() + '\n'
    fs.writeFileSync(credPath, yaml)
    console.log('OK     : ZAI_API_KEY stored from environment into .credentials.yaml')
  } else {
    console.log('')
    console.log('NOTE   : ZAI_API_KEY is not configured yet. Two options:')
    console.log('  a) In the DeepSeek desktop app: Models/credentials surface -> add reference')
    console.log('     ZAI_API_KEY (written to $DSH_HOME/.credentials.yaml), or')
    console.log('  b) re-run with the key in the environment:')
    console.log('     pwsh:  $env:ZAI_API_KEY = "<your key>"; pwsh -NoProfile -File install.ps1')
    console.log('')
    if (process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      await new Promise((resolve) => {
        rl.question('Or paste the key now (input is echoed; Enter to skip): ', (answer) => {
          const key = answer.trim()
          if (key.length > 0) {
            let yaml = fs.existsSync(credPath) ? fs.readFileSync(credPath, 'utf8') : ''
            if (!/^refs:/m.test(yaml)) yaml = yaml.trimEnd() + '\nrefs:\n'
            yaml = yaml.trimEnd() + '\n  ZAI_API_KEY: ' + key + '\n'
            fs.writeFileSync(credPath, yaml)
            console.log('OK     : ZAI_API_KEY stored.')
          } else {
            console.log('SKIPPED: add the key later; the plugin will not load without it.')
          }
          rl.close()
          resolve()
        })
      })
    }
  }
} else {
  console.log('OK     : ZAI_API_KEY already configured')
}

// --- 3. pnpm install ----------------------------------------------------------
console.log('RUN    : pnpm install (profile)')
const res = spawnSync(nodeExe, [pnpmCjs, 'install'], { cwd: profileDir, stdio: 'inherit' })
if (res.status !== 0) {
  console.error('ERROR  : pnpm install exited with', res.status)
  process.exit(1)
}
console.log('')
console.log('DONE   : restart the DeepSeek Harness desktop app, then verify:')
console.log('        pwsh -NoProfile -File verify.ps1    (or node scripts/verify.mjs)')
