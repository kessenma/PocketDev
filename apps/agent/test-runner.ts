import { ClaudePtyRunner } from './src/services/tasks/claude-pty-runner.ts'
const scriptPath = '/tmp/runner-test.sh'
await Bun.write(scriptPath, '#!/bin/bash\necho START\nfor i in 1 2 3; do echo line$i; sleep 0.2; done\necho END\nexit 0\n')
Bun.spawnSync(['chmod', '+x', scriptPath])
const r = new ClaudePtyRunner()
await new Promise<void>((resolve) => {
  r.spawn(scriptPath, {
    cols: 80, rows: 24, cwd: '/tmp', env: process.env as any,
    onData: (chunk) => process.stdout.write('GOT: ' + JSON.stringify(chunk) + '\n'),
    onExit: (code) => { console.log('EXIT:', code); resolve() },
  })
})
