#!/usr/bin/env node
import { readFile, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const assignment = /^([ \t]*)isLoopback:\s*[^,\n]+,/gm
const replacement = 'isLoopback: true,'

async function resolveTargets() {
  if (process.argv[2]) {
    return [process.argv[2]]
  }

  const candidateNames = ['client.browser.js', 'client.node.js', 'client.js']
  const targets = []

  for (const name of candidateNames) {
    const candidatePath = fileURLToPath(
      new URL(`../node_modules/@deepseek-ai/dsh-client-connection/lib/${name}`, import.meta.url),
    )
    try {
      await stat(candidatePath)
      targets.push(candidatePath)
    } catch {
      // File does not exist in this release; ignore.
    }
  }

  if (targets.length === 0) {
    throw new Error(
      `DSH authenticated-proxy client patch could not find any client entrypoint under @deepseek-ai/dsh-client-connection/lib/ (checked ${candidateNames.join(', ')})`,
    )
  }

  return targets
}

const targets = await resolveTargets()

for (const clientPath of targets) {
  const source = await readFile(clientPath, 'utf8')
  const assignments = [...source.matchAll(assignment)]
  const patchedAssignments = assignments.filter((match) => match[0].trim() === replacement)

  if (assignments.length === 1 && patchedAssignments.length === 1) {
    console.log(`DSH authenticated-proxy client patch already applied: ${clientPath}`)
    continue
  }

  if (assignments.length !== 1 || patchedAssignments.length !== 0) {
    throw new Error(
      `DSH authenticated-proxy client patch expected one isLoopback assignment in ${clientPath}, found ${assignments.length} assignments (${patchedAssignments.length} already patched)`,
    )
  }

  await writeFile(clientPath, source.replace(assignment, '$1isLoopback: true,'))
  console.log(`Applied DSH authenticated-proxy client patch: ${clientPath}`)
}
