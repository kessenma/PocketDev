#!/usr/bin/env node

// Kills any process listening on the PocketDev agent port.

const { execFileSync } = require('node:child_process')
const { stderr, stdout, exit } = require('node:process')

const agentPort = '4387'
const gracefulWaitMs = 1500
const pollIntervalMs = 100

function main() {
  const pids = getListeningPids(agentPort)

  if (pids.length === 0) {
    stdout.write(`No process is listening on port ${agentPort}.\n`)
    return
  }

  stdout.write(`Stopping processes on port ${agentPort}: ${pids.join(', ')}\n`)

  try {
    sendSignal('TERM', pids)
    waitForPortToClear(agentPort, gracefulWaitMs)

    const remaining = getListeningPids(agentPort)
    if (remaining.length > 0) {
      stdout.write(`Processes still active on port ${agentPort}, forcing shutdown: ${remaining.join(', ')}\n`)
      sendSignal('KILL', remaining)
      waitForPortToClear(agentPort, gracefulWaitMs)
    }

    const final = getListeningPids(agentPort)
    if (final.length > 0) {
      throw new Error(`Port ${agentPort} is still in use by: ${final.join(', ')}`)
    }
  } catch (error) {
    stderr.write(`Failed to stop one or more processes on port ${agentPort}.\n`)
    throw error
  }
}

function sendSignal(signal, pids) {
  execFileSync('kill', [`-${signal}`, ...pids], {
    stdio: ['ignore', 'inherit', 'inherit'],
  })
}

function getListeningPids(port) {
  try {
    const output = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function waitForPortToClear(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (getListeningPids(port).length === 0) return
    sleep(pollIntervalMs)
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

try {
  main()
} catch (error) {
  stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  exit(1)
}
