import React from 'react'
import CodeBrowseTab from '../code-screen/code-browse/CodeBrowseTab'

type Props = React.ComponentProps<typeof CodeBrowseTab>

export default function FileWorkspace(props: Props) {
  return <CodeBrowseTab {...props} />
}
