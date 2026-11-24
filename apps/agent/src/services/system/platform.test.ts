import { afterEach, describe, expect, test } from 'bun:test'
import { getServiceManager, launchdServiceTarget, restartAgentShell, LAUNCHD_LABEL, SYSTEMD_SERVICE_NAME } from './platform.ts'

const saved = {
  manager: process.env.POCKETDEV_SERVICE_MANAGER,
  domain: process.env.POCKETDEV_LAUNCHD_DOMAIN,
}

afterEach(() => {
  if (saved.manager === undefined) delete process.env.POCKETDEV_SERVICE_MANAGER
  else process.env.POCKETDEV_SERVICE_MANAGER = saved.manager
  if (saved.domain === undefined) delete process.env.POCKETDEV_LAUNCHD_DOMAIN
  else process.env.POCKETDEV_LAUNCHD_DOMAIN = saved.domain
})

describe('platform service manager', () => {
  test('explicit POCKETDEV_SERVICE_MANAGER wins', () => {
    process.env.POCKETDEV_SERVICE_MANAGER = 'launchd'
    expect(getServiceManager()).toBe('launchd')
    process.env.POCKETDEV_SERVICE_MANAGER = 'systemd'
    expect(getServiceManager()).toBe('systemd')
  })

  test('systemd restart command is unchanged from the original install', () => {
    process.env.POCKETDEV_SERVICE_MANAGER = 'systemd'
    expect(restartAgentShell()).toBe(`systemctl restart ${SYSTEMD_SERVICE_NAME}`)
  })

  test('launchd restart uses kickstart -k on the recorded domain', () => {
    process.env.POCKETDEV_SERVICE_MANAGER = 'launchd'
    process.env.POCKETDEV_LAUNCHD_DOMAIN = 'user/501'
    expect(launchdServiceTarget()).toBe(`user/501/${LAUNCHD_LABEL}`)
    expect(restartAgentShell()).toBe(`launchctl kickstart -k user/501/${LAUNCHD_LABEL}`)
  })

  test('launchd defaults to the gui domain for the current uid', () => {
    process.env.POCKETDEV_SERVICE_MANAGER = 'launchd'
    delete process.env.POCKETDEV_LAUNCHD_DOMAIN
    expect(launchdServiceTarget()).toMatch(new RegExp(`^gui/\\d+/${LAUNCHD_LABEL.replace(/\./g, '\\.')}$`))
  })

  test('unsupervised agents do not try to restart themselves', () => {
    process.env.POCKETDEV_SERVICE_MANAGER = 'none'
    expect(restartAgentShell()).toBe('true')
  })
})
