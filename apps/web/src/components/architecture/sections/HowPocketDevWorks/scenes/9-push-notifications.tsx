import { PushNotificationsScene } from '../explainers/9-PushNotificationsScene'
import type { SceneConfig } from '../timeline-types'

export const pushNotificationsScene: SceneConfig = {
  id: 'push-notifications',
  kind: 'takeover',
  weight: 2.8,
  holdRatio: 0.82,
  reducedMotionFullBleed: true,
  render: ({ progress, isDesktopLayout }) => (
    <div
      className="relative z-10 h-full"
      style={{
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
      }}
    >
      <PushNotificationsScene progress={progress} isDesktopLayout={isDesktopLayout} />
    </div>
  ),
}
