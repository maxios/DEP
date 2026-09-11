import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { spawnSync } from 'child_process'
import { DepWorld } from '../support/world'
import pkg from '../../package.json'

const BUNDLE_SCRIPT = resolve(import.meta.dir, '..', '..', 'scripts', 'bundle.ts')

function manifestOf(world: DepWorld): any {
  const bundle = world.notes.get('bundle') as string
  const res = spawnSync('unzip', ['-p', bundle, 'manifest.json'], { encoding: 'utf-8' })
  assert.equal(res.status, 0, res.stderr)
  return JSON.parse(res.stdout)
}

Given('a built CLI for {string}', function (this: DepWorld, target: string) {
  this.ensureRoot()
  const dist = join(this.root, 'dist')
  mkdirSync(dist, { recursive: true })
  const name = `dep-${target}${target.startsWith('windows') ? '.exe' : ''}`
  writeFileSync(join(dist, name), `#!/bin/sh\necho "dep ${pkg.version}"\n`)
  this.notes.set('target', target)
  this.notes.set('binary', join(dist, name))
})

When('I build the desktop bundle for it', function (this: DepWorld) {
  const target = this.notes.get('target') as string
  const res = spawnSync('bun', ['run', BUNDLE_SCRIPT, `--target=${target}`, `--binary=${this.notes.get('binary')}`, `--out=${join(this.root, 'dist')}`], { encoding: 'utf-8' })
  this.cli = { stdout: res.stdout, stderr: res.stderr, code: res.status }
  this.notes.set('bundle', join(this.root, 'dist', `dep-${target}.mcpb`))
})

When('I build the desktop bundle for a platform that was not built', function (this: DepWorld) {
  this.ensureRoot()
  const res = spawnSync('bun', ['run', BUNDLE_SCRIPT, '--target=linux-arm64', `--binary=${join(this.root, 'dist', 'dep-linux-arm64')}`, `--out=${join(this.root, 'dist')}`], { encoding: 'utf-8' })
  this.cli = { stdout: res.stdout, stderr: res.stderr, code: res.status }
  this.error = res.status === 0 ? undefined : new Error(res.stderr)
})

Then('I receive one bundle file for {string}', function (this: DepWorld, target: string) {
  assert.equal(this.cli!.code, 0, this.cli!.stderr)
  assert.ok(existsSync(join(this.root, 'dist', `dep-${target}.mcpb`)))
})

Then('it holds a manifest and the CLI under the server directory', function (this: DepWorld) {
  const target = this.notes.get('target') as string
  const res = spawnSync('unzip', ['-Z1', this.notes.get('bundle') as string], { encoding: 'utf-8' })
  const names = res.stdout.trim().split('\n')
  assert.ok(names.includes('manifest.json'), names.join(','))
  assert.ok(names.includes(target.startsWith('windows') ? 'server/dep.exe' : 'server/dep'), names.join(','))
})

Then('the manifest declares a binary server whose command is the bundled CLI', function (this: DepWorld) {
  const m = manifestOf(this)
  assert.equal(m.manifest_version, '0.3')
  assert.equal(m.server.type, 'binary')
  assert.equal(m.server.mcp_config.command, '${__dirname}/server/dep')
  assert.deepEqual(m.server.mcp_config.args.slice(0, 2), ['mcp', '--root'])
})

Then('the manifest asks the person for the project root when installing', function (this: DepWorld) {
  const m = manifestOf(this)
  assert.equal(m.user_config.project_root.type, 'directory')
  assert.equal(m.user_config.project_root.required, true)
  assert.ok(m.server.mcp_config.args.includes('${user_config.project_root}'))
})

Then('the manifest names the platform {string}', function (this: DepWorld, platform: string) {
  assert.deepEqual(manifestOf(this).compatibility.platforms, [platform])
})

Then("the manifest carries the CLI's version", function (this: DepWorld) {
  assert.equal(manifestOf(this).version, pkg.version)
})

Then('I am told which platforms are built', function (this: DepWorld) {
  assert.ok(this.cli!.stderr.includes('built platforms'), this.cli!.stderr)
})
