import React from 'react'
import GitTab from '../code-screen/git/GitTab'

type Props = React.ComponentProps<typeof GitTab>

export default function GitWorkspace(props: Props) {
  return <GitTab {...props} />
}
