import {
  SiAndroid,
  SiAndroidHex,
  SiApple,
  SiAppleHex,
} from '@icons-pack/react-simple-icons'
import { ConnectStage } from '../explainers/ConnectStage'
import type { SceneConfig } from '../timeline-types'

export const connectScene: SceneConfig = {
  id: 'connect',
  kind: 'explainer',
  weight: 2,
  holdRatio: 0.7,
  explainer: {
    title: 'Connect Your Server',
    caption:
      'PocketDev pairs your phone with a self-hosted agent through an explicit handshake, then keeps the server as the stable execution point.',
    cardClassName: 'w-full max-w-4xl',
    stageBorderless: true,
    legend: [
      { label: 'iOS', icon: <SiApple size={14} color={`#${SiAppleHex}`} /> },
      { label: 'Android', icon: <SiAndroid size={14} color={`#${SiAndroidHex}`} /> },
    ],
  },
  render: ({ active, progress }) => (
    <ConnectStage active={active} progress={progress} />
  ),
}
