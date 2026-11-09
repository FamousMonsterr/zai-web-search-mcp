// Builds the publishable npm package into dist/npm/ from the plugin sources.
// The local development install keeps the @local/ name (profile link:); the npm
// package uses the public name so the dsh plugin manager can install it for
// anyone from registry.npmjs.org / npmmirror (install_bundle accepts npm specs
// and auto-activates packages carrying dsh.bundle.patch).
//
//   node scripts/prepare-npm.mjs            # -> dist/npm/
//   npm login && npm publish dist/npm       # publishing needs an npm account
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'dist', 'npm')
const NPM_NAME = 'dsh-zai-web-search-mcp'

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(path.join(out, 'locale'), { recursive: true })

for (const f of ['index.js', 'client.js', 'icon.svg', 'README.md', 'LICENSE']) {
  fs.copyFileSync(path.join(root, f), path.join(out, f))
}
for (const f of ['en.json', 'ru.json']) {
  fs.copyFileSync(path.join(root, 'locale', f), path.join(out, 'locale', f))
}

// package.json: public name, not private, engines.dsh gate (the plugin manager
// blocks installs whose engines.dsh rejects the running app version).
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
pkg.name = NPM_NAME
pkg.private = false
pkg.description = 'Z.ai (GLM Coding Plan) plugin for DeepSeek Harness: web_search via the web_search_prime MCP server, the mcp__zai__web_search_prime tool, and a live quota chip.'
pkg.repository = { type: 'git', url: 'git+https://github.com/FamousMonsterr/zai-web-search-mcp.git' }
pkg.homepage = 'https://github.com/FamousMonsterr/zai-web-search-mcp#readme'
pkg.bugs = { url: 'https://github.com/FamousMonsterr/zai-web-search-mcp/issues' }
pkg.keywords = ['deepseek-harness', 'dsh', 'zai', 'glm', 'glm-coding-plan', 'mcp', 'web-search', 'quota', 'plugin']
pkg.engines = { ...(pkg.engines || {}), dsh: '>=0.2.1-rc.5' }
delete pkg.publishConfig
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')

// cordis.patch.yml: the inserted bundle row must carry the npm package name so
// reconcileProfilePlugins resolves the installed dependency.
const patchSrc = fs.readFileSync(path.join(root, 'cordis.patch.yml'), 'utf8')
const patch = patchSrc.replaceAll("'@local/zai-web-search-mcp'", `'${NPM_NAME}'`)
if (patch === patchSrc && patchSrc.includes('@local/')) throw new Error('cordis.patch.yml: expected @local name to rewrite')
fs.writeFileSync(path.join(out, 'cordis.patch.yml'), patch)

console.log('npm package ready:', out)
console.log('  name:', NPM_NAME, 'version:', pkg.version)
console.log('  publish with:  npm publish ' + path.relative(root, out))
