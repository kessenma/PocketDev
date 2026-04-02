#!/usr/bin/env node

// Interactive helper for the local agent testing workflow.
// Usage and troubleshooting live in docs/testing/local-testing-setup.md.

const fs = require('node:fs')
const path = require('node:path')
const { spawn, execFileSync } = require('node:child_process')
const readline = require('node:readline/promises')
const { stdin, stdout, stderr, exit, env } = require('node:process')

const repoRoot = path.resolve(__dirname, '..')
const agentDir = path.join(repoRoot, 'apps', 'agent')
const agentDataDir = path.join(agentDir, 'data')

async function main() {
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
  })

  try {
    printHeader()
    printState()
    printMenu()

    const choice = (await rl.question('Choose an option: ')).trim().toLowerCase()

    switch (choice) {
      case '1':
        stopExistingAgentProcesses()
        resetAgentData()
        printNormalModeHelp(true)
        startAgent({ devMode: false })
        break
      case '2':
        stopExistingAgentProcesses()
        resetAgentData()
        printDevModeHelp(true)
        startAgent({ devMode: true })
        break
      case '3':
        stopExistingAgentProcesses()
        printNormalModeHelp(false)
        startAgent({ devMode: false })
        break
      case '4':
        stopExistingAgentProcesses()
        printDevModeHelp(false)
        startAgent({ devMode: true })
        break
      case '5':
        stopExistingAgentProcesses()
        resetAgentData()
        stdout.write('\nLocal agent data cleared.\n')
        break
      case 'q':
      case 'quit':
      case 'exit':
        stdout.write('\nCanceled.\n')
        break
      default:
        stderr.write(`\nUnknown option: ${choice || '(empty)'}\n`)
        exit(1)
    }
  } finally {
    rl.close()
  }
}

function printHeader() {
  stdout.write('\nPocketDev Local Testing\n\n')
}

function printState() {
  const hasData = fs.existsSync(agentDataDir)
  stdout.write(`Agent data directory: ${hasData ? 'present' : 'missing'}\n`)
  if (hasData) {
    stdout.write(`Path: ${agentDataDir}\n`)
  }
  stdout.write('\n')
}

function printMenu() {
  stdout.write('1. Fresh normal pairing flow\n')
  stdout.write('2. Fresh dev mode\n')
  stdout.write('3. Normal mode using existing agent state\n')
  stdout.write('4. Dev mode using existing agent state\n')
  stdout.write('5. Reset local agent data only\n')
  stdout.write('q. Quit\n\n')
}

function resetAgentData() {
  fs.rmSync(agentDataDir, { recursive: true, force: true })
}

function stopExistingAgentProcesses() {
  stdout.write('\nStopping any existing agent process on port 4387.\n')
  execFileSync('pnpm', ['run', 'kill'], {
    cwd: agentDir,
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  stdout.write('Agent port is clear.\n')
}

function printNormalModeHelp(fresh) {
  stdout.write('\nStarting agent in normal pairing mode.\n')
  if (fresh) {
    stdout.write('Existing local agent state was cleared first.\n')
  }
  stdout.write('Watch the terminal for "Setup code: ABCD-1234".\n')
  stdout.write('Use that code with localhost on iOS or 10.0.2.2 on Android.\n\n')
}

function printDevModeHelp(fresh) {
  stdout.write('\nStarting agent in dev mode.\n')
  if (fresh) {
    stdout.write('Existing local agent state was cleared first.\n')
  }
  stdout.write('Auth will be bypassed and no setup code is required.\n')
  stdout.write('Use localhost on iOS or 10.0.2.2 on Android.\n\n')
}

function startAgent({ devMode }) {
  const child = spawn('bun', ['run', 'dev'], {
    cwd: agentDir,
    stdio: 'inherit',
    env: {
      ...env,
      ...(devMode ? { POCKETDEV_DEV_MODE: '1' } : {}),
    },
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      exit(1)
    }
    exit(code ?? 0)
  })
}

main().catch((error) => {
  stderr.write(`\n${error instanceof Error ? error.message : String(error)}\n`)
  exit(1)
})
