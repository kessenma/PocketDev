jest.mock('./crypto', () => ({
  signMessage: jest.fn(),
}))

jest.mock('./storage', () => ({
  getServer: jest.fn(),
}))

const { buildPocketDevAuthorizationHeader, normalizePairResponse } = require('./auth')
const { signMessage } = require('./crypto')
const { getServer } = require('./storage')

describe('normalizePairResponse', () => {
  it('accepts the new camelCase response shape', () => {
    expect(
      normalizePairResponse({
        deviceId: 'device-123',
        serverPublicKey: 'server-pub',
      }),
    ).toEqual({
      deviceId: 'device-123',
      serverPublicKey: 'server-pub',
    })
  })

  it('accepts legacy snake_case response fields', () => {
    expect(
      normalizePairResponse({
        device_id: 'device-123',
        server_public_key: 'server-pub',
      }),
    ).toEqual({
      deviceId: 'device-123',
      serverPublicKey: 'server-pub',
    })
  })

  it('falls back to legacy serverId fields for backward compatibility', () => {
    expect(
      normalizePairResponse({
        server_id: 'device-123',
      }),
    ).toEqual({
      deviceId: 'device-123',
      serverPublicKey: undefined,
    })
  })

  it('throws when the response is missing a device identifier', () => {
    expect(() => normalizePairResponse({})).toThrow('Pairing response missing device ID')
  })
})

describe('buildPocketDevAuthorizationHeader', () => {
  beforeEach(() => {
    getServer.mockReset()
    signMessage.mockReset()
  })

  it('builds the PocketDev auth header from the stored device id and signature', async () => {
    getServer.mockReturnValue({
      ip: '127.0.0.1',
      port: 7429,
      deviceId: 'device-123',
    })
    signMessage.mockResolvedValue('deadbeef')

    const header = await buildPocketDevAuthorizationHeader(1_700_000_000_000)
    expect(header.startsWith('PocketDev ')).toBe(true)

    const token = header.replace(/^PocketDev\s+/, '')
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())

    expect(signMessage).toHaveBeenCalledWith('1700000000000')
    expect(payload).toEqual({
      deviceId: 'device-123',
      timestamp: 1_700_000_000_000,
      signature: 'deadbeef',
    })
  })

  it('throws when there is no paired device', async () => {
    getServer.mockReturnValue(null)

    await expect(buildPocketDevAuthorizationHeader()).rejects.toThrow('No paired device found')
  })
})
