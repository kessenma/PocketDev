import { useState } from 'react'
import { DomainSettings } from '#/components/DomainSettings'
import { PasskeySettings } from '#/components/PasskeySettings'
import type { DomainSettings as DomainSettingsType } from '#/lib/api'

export function DomainPasskeyPanel() {
  const [hasDomain, setHasDomain] = useState(false)

  function handleSettingsChanged(settings: DomainSettingsType) {
    setHasDomain(Boolean(settings.domain))
  }

  return (
    <div className="space-y-4">
      <DomainSettings onSettingsChanged={handleSettingsChanged} />
      <PasskeySettings disabled={!hasDomain} />
    </div>
  )
}
