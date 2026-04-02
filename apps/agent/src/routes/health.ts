import { Elysia } from 'elysia'
import { hasDevices } from '../services/setup.ts'

export const healthRoutes = new Elysia()
  .get('/health', () => ({
    status: 'ok',
    paired: hasDevices(),
    uptime: process.uptime(),
  }))
