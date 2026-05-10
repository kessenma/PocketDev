/**
 * Docs: see `docs/server-actions/mobile-server-actions.md` for the workspace map, entry points,
 * and backend wiring notes. This module is mobile/client-side only today and
 * still needs to be wired into the server-side app.
 */
export { default as ServerSegmentedControl } from './ServerSegmentedControl'
export type {
  ServerErrorEntry,
  ServerMetric,
  ServerMetricTone,
  ServerNetworkEntry,
  ServerPortEntry,
  ServerQuickAction,
  ServerView,
} from './model'
