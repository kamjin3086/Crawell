#!/usr/bin/env node
// ----------------------------------------------
// Package Firefox source bundle for AMO review
// ----------------------------------------------
// Generates crawell-tools-source.zip in repository root, containing
// only the files required to build the extension.
//
// EXCLUDES:
//   - build outputs (.output/)
//   - node_modules
//   - docs (including this script)
//   - public/provider-icons (large marketing assets)
//   - root README.md & other pre-built archives / logs / maps
//
// USAGE:
//   node docs/package_firefox_source.js
// ----------------------------------------------

import { createWriteStream, existsSync, unlinkSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'

// Resolve repository root based on the location of this script
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = resolve(__dirname, '..')
const ZIP_NAME = 'crawell-tools-source.zip'
const OUTPUT_PATH = join(ROOT_DIR, ZIP_NAME)

// Remove old archive if it exists
if (existsSync(OUTPUT_PATH)) {
  unlinkSync(OUTPUT_PATH)
}

console.log(`Creating ${ZIP_NAME} ...`) // eslint-disable-line no-console

const output = createWriteStream(OUTPUT_PATH)
const archive = archiver('zip', { zlib: { level: 9 } })

output.on('close', () => {
  console.log(`Done. Archive located at ${OUTPUT_PATH}`) // eslint-disable-line no-console
})

archive.on('warning', (err) => {
  // Log non-fatal warnings
  if (err.code === 'ENOENT') {
    console.warn(err.message) // eslint-disable-line no-console
  } else {
    throw err
  }
})

archive.on('error', (err) => {
  throw err
})

archive.pipe(output)

// Add all files except the excluded patterns
archive.glob('**/*', {
  cwd: ROOT_DIR,
  dot: true,
  ignore: [
    '**/.wxt/**',
    '**/.git/**',
    '**/.vscode/**',
    'node_modules',
    '**/node_modules/**',
    '**/.output/**',
    '**/docs/**',
    'README.md',
    '**/*.zip',
    '**/*.log',
    '**/*.map',

    'plugins/tools/README.md',
    "crawell-tools-source/**",
    "crawell-tools-source.zip",
  ],
})

// Add plugins/tools/README.md to archive root as README.md (for AMO reviewers)
const README_SRC = join(ROOT_DIR, 'plugins', 'tools', 'README.md')
if (existsSync(README_SRC)) {
  archive.file(README_SRC, { name: 'README.md' })
}

archive.finalize() 