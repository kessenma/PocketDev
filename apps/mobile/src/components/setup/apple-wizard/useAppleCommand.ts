import { useCallback, useEffect, useRef, useState } from 'react'
import type { ScrollView } from 'react-native'
import { useTerminalCommand } from '../../../hooks/useTerminalCommand'
import type { SecurePromptSpec } from '../../../utils/secure-prompts'
import { getMarkerResult, nextRunId, withResultMarker } from './apple-setup-utils'

export type AppleRunState = 'idle' | 'running' | 'ok' | 'fail' | 'cancelled'

interface Options {
  securePrompts?: SecurePromptSpec[]
  /** Called once when the wrapped command finishes */
  onFinish?: (key: string, result: 'ok' | 'fail', output: string) => void
}

/**
 * Runs one wizard command at a time in a persistent setup terminal and reports
 * when it finishes. Sudo and Apple sign-in prompts are surfaced as native sheets.
 */
export function useAppleCommand({ securePrompts, onFinish }: Options = {}) {
  const scrollRef = useRef<ScrollView>(null)
  const [runState, setRunState] = useState<AppleRunState>('idle')
  const [runKey, setRunKey] = useState<string | null>(null)
  const runIdRef = useRef<string | null>(null)
  const runKeyRef = useRef<string | null>(null)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const terminal = useTerminalCommand({
    persistent: true,
    securePrompts,
    onOutput: () => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    },
  })

  const { output, reset, sendCommand, sendInput, cancelSecurePrompt, cancelSudoPrompt } = terminal

  useEffect(() => {
    const id = runIdRef.current
    if (!id) return
    const result = getMarkerResult(output, id)
    if (!result) return
    runIdRef.current = null
    setRunState(result)
    onFinishRef.current?.(runKeyRef.current ?? '', result, output)
  }, [output])

  const run = useCallback((key: string, command: string) => {
    reset()
    const id = nextRunId(key)
    runIdRef.current = id
    runKeyRef.current = key
    setRunKey(key)
    setRunState('running')
    sendCommand(withResultMarker(command, id))
  }, [reset, sendCommand])

  /** Interrupt the running command (Ctrl-C). */
  const stop = useCallback(() => {
    if (!runIdRef.current) return
    runIdRef.current = null
    sendInput('\x03')
    setRunState('cancelled')
  }, [sendInput])

  const cancelPrompt = useCallback(() => {
    cancelSecurePrompt()
    runIdRef.current = null
    setRunState('cancelled')
  }, [cancelSecurePrompt])

  const cancelSudo = useCallback(() => {
    cancelSudoPrompt()
    stop()
  }, [cancelSudoPrompt, stop])

  return {
    ...terminal,
    scrollRef,
    runState,
    runKey,
    running: runState === 'running',
    run,
    stop,
    cancelPrompt,
    cancelSudo,
  }
}

export type AppleCommandRunner = ReturnType<typeof useAppleCommand>
