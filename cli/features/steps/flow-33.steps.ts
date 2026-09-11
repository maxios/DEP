import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { spawnSync } from 'child_process'
import { DepWorld } from '../support/world'
import pkg from '../../package.json'

export const INSTALLED = pkg.version
export const NEWER = '9.9.9'
const platformBinary = `dep-${process.platform}-${process.arch}`

interface Release {
  /** what the "release service" says is latest */
  latest: string
  /** what the download returns for the platform binary: a runnable script, garbage, or a failure */
  asset: 'runnable' | 'corrupt' | 'fail'
  /** which tags exist */
  tags: string[]
}

export interface Fake {
  server: ReturnType<typeof Bun.serve>
  api: string
  downloads: string
  release: Release
  /** Every path the launcher or CLI asked for. */
  requests: string[]
}

/** A stand-in for GitHub releases, serving whatever the scenario declared. */
export function startFakeReleases(release: Release): Fake {
  const requests: string[] = []
  const server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url)
      requests.push(url.pathname)
      if (url.pathname === '/releases/latest') return Response.json({ tag_name: `v${release.latest}` })
      const tagMatch = url.pathname.match(/^\/releases\/tags\/v?(.+)$/)
      if (tagMatch) {
        return release.tags.includes(tagMatch[1]!) ? Response.json({ tag_name: `v${tagMatch[1]}` }) : new Response('not found', { status: 404 })
      }
      const dl = url.pathname.match(/^\/download\/v?([^/]+)\/(.+)$/)
      if (dl && dl[2] === platformBinary) {
        if (release.asset === 'fail') return new Response('boom', { status: 500 })
        if (release.asset === 'corrupt') return new Response(new Uint8Array([0, 1, 2, 3, 255, 254]))
        return new Response(runnableAsset(dl[1]!))
      }
      return new Response('not found', { status: 404 })
    },
  })
  const base = `http://127.0.0.1:${server.port}`
  return { server, api: `${base}/releases`, downloads: `${base}/download`, release, requests }
}

/** A stand-in binary: reports a version, and as an MCP server answers the first request. */
export function runnableAsset(version: string): string {
  return `#!/bin/sh
case "$1" in
  version) echo "dep ${version}" ;;
  mcp) read line; echo '{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{}},"serverInfo":{"name":"dep","version":"${version}"}}}' ;;
  *) echo "dep: unknown command $1" >&2; exit 1 ;;
esac
`
}

export function fake(world: DepWorld): Fake {
  let f = world.notes.get('fake') as Fake | undefined
  if (!f) {
    f = startFakeReleases({ latest: INSTALLED, asset: 'runnable', tags: [INSTALLED] })
    world.notes.set('fake', f)
  }
  return f
}

export function installedPath(world: DepWorld): string {
  return (world.notes.get('installedPath') as string | undefined) ?? join(world.root, 'bin', 'dep')
}

function upgrade(world: DepWorld, extra: string[] = []) {
  const f = fake(world)
  const target = world.notes.get('fromSource') ? [] : ['--target', installedPath(world)]
  return world.runCliAsync(['upgrade', ...target, ...extra], {
    env: { DEP_RELEASES_API: f.api, DEP_RELEASES_DOWNLOAD: f.downloads },
  })
}

After(function (this: DepWorld) {
  const f = this.notes.get('fake') as Fake | undefined
  f?.server.stop(true)
})

Given('the CLI is installed', function (this: DepWorld) {
  this.ensureRoot()
  mkdirSync(join(this.root, 'bin'), { recursive: true })
  const path = installedPath(this)
  writeFileSync(path, runnableAsset(INSTALLED))
  chmodSync(path, 0o755)
  this.notes.set('installedBefore', readFileSync(path, 'utf-8'))
})

Given('a newer release is published', function (this: DepWorld) {
  fake(this).release.latest = NEWER
  fake(this).release.tags.push(NEWER)
})

Given('the latest published release is the installed version', function (this: DepWorld) {
  fake(this).release.latest = INSTALLED
})

Given('the CLI is running from its source tree', function (this: DepWorld) {
  this.notes.set('fromSource', true)
})

Given('the newest published release is corrupt', function (this: DepWorld) {
  fake(this).release.latest = NEWER
  fake(this).release.tags.push(NEWER)
  fake(this).release.asset = 'corrupt'
})

Given('the release service is unreachable', function (this: DepWorld) {
  const f = fake(this)
  f.server.stop(true)
  f.api = 'http://127.0.0.1:1/releases'
  f.downloads = 'http://127.0.0.1:1/download'
})

Given('its download fails', function (this: DepWorld) {
  fake(this).release.asset = 'fail'
})

When('I ask for its version', async function (this: DepWorld) {
  await this.runCliAsync(['version'])
})

When('I ask the CLI to upgrade itself', async function (this: DepWorld) {
  await upgrade(this)
})

When('I ask whether a newer release exists', async function (this: DepWorld) {
  await upgrade(this, ['--check'])
})

When('I ask the CLI to install a release that does not exist', async function (this: DepWorld) {
  await upgrade(this, ['--version', 'v0.0.1'])
})

Then('I am told a version number', function (this: DepWorld) {
  assert.equal(this.cli!.code, 0, this.cli!.stderr)
  assert.match(this.cli!.stdout.trim(), /^dep \d+\.\d+\.\d+$/)
})

Then('it is the version the CLI was built from', function (this: DepWorld) {
  assert.equal(this.cli!.stdout.trim(), `dep ${INSTALLED}`)
})

Then('I am told the installed version and the version being installed', function (this: DepWorld) {
  assert.equal(this.cli!.code, 0, this.cli!.stderr)
  assert.ok(this.cli!.stdout.includes(`Installed: dep ${INSTALLED}`), this.cli!.stdout)
  assert.ok(this.cli!.stdout.includes(`Installing: dep ${NEWER}`), this.cli!.stdout)
})

Then('the installed CLI is replaced with the newer release', function (this: DepWorld) {
  const path = installedPath(this)
  assert.notEqual(readFileSync(path, 'utf-8'), this.notes.get('installedBefore'))
  assert.ok(existsSync(`${path}.prev`), 'previous binary was not kept')
})

Then('asking the CLI for its version afterwards reports the newer version', function (this: DepWorld) {
  const res = spawnSync(installedPath(this), ['version'], { encoding: 'utf-8' })
  assert.equal(res.stdout.trim(), `dep ${NEWER}`)
})

Then('I am told the installed version, the latest version, and that an upgrade is available', function (this: DepWorld) {
  assert.equal(this.cli!.code, 0, this.cli!.stderr)
  const out = this.cli!.stdout
  assert.ok(out.includes(`Installed ${INSTALLED}`) && out.includes(`latest ${NEWER}`) && out.includes('upgrade available'), out)
})

Then('the installed CLI is left as it was', function (this: DepWorld) {
  const path = installedPath(this)
  assert.equal(readFileSync(path, 'utf-8'), this.notes.get('installedBefore'))
  assert.ok(!existsSync(`${path}.prev`))
  assert.ok(!existsSync(`${path}.download`) && !existsSync(join(dirname(path), '.dep.download')), 'a partial download was left behind')
})

Then('I am told it is already up to date', function (this: DepWorld) {
  assert.equal(this.cli!.code, 0, this.cli!.stderr)
  assert.ok(this.cli!.stdout.includes('already up to date'), this.cli!.stdout)
})

Then('I am told to update the source tree instead', function (this: DepWorld) {
  assert.ok(this.cli!.stderr.includes('git pull'), this.cli!.stderr)
})

Then('I am told the downloaded release could not be verified', function (this: DepWorld) {
  assert.notEqual(this.cli!.code, 0)
  assert.ok(this.cli!.stderr.includes('could not be verified'), this.cli!.stderr)
})

Then('I am told the release service could not be reached', function (this: DepWorld) {
  assert.notEqual(this.cli!.code, 0)
  assert.ok(this.cli!.stderr.includes('could not be reached'), this.cli!.stderr)
})

Then('I am told the download failed', function (this: DepWorld) {
  assert.notEqual(this.cli!.code, 0)
  assert.ok(this.cli!.stderr.includes('download failed'), this.cli!.stderr)
})

Then('I am told that release is not published', function (this: DepWorld) {
  assert.ok(this.cli!.stderr.includes('not published'), this.cli!.stderr)
})
