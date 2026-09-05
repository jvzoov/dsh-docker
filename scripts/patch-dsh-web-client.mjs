#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const clientPath = process.argv[2] ?? fileURLToPath(
  new URL('../node_modules/@deepseek-ai/dsh-client-connection/lib/client.js', import.meta.url),
)
const assignment = /^([ \t]*)isLoopback:\s*[^,\n]+,/gm
const replacement = 'isLoopback: true,'
const source = await readFile(clientPath, 'utf8')
const assignments = [...source.matchAll(assignment)]
const patchedAssignments = assignments.filter((match) => match[0].trim() === replacement)

if (assignments.length === 1 && patchedAssignments.length === 1) {
  console.log(`DSH authenticated-proxy client patch already applied: ${clientPath}`)
  process.exit(0)
}

if (assignments.length !== 1 || patchedAssignments.length !== 0) {
  throw new Error(
    `DSH authenticated-proxy client patch expected one isLoopback assignment in ${clientPath}, found ${assignments.length} assignments (${patchedAssignments.length} already patched)`,
  )
}

await writeFile(clientPath, source.replace(assignment, '$1isLoopback: true,'))
console.log(`Applied DSH authenticated-proxy client patch: ${clientPath}`)
