import React from 'react'
import ScriptsTab from '../code-screen/scripts/ScriptsTab'

type Props = React.ComponentProps<typeof ScriptsTab>

export default function ScriptsWorkspace(props: Props) {
  return <ScriptsTab {...props} />
}
