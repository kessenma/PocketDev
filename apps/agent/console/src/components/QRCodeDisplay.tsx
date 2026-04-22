import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { useTheme } from '../context/ThemeContext'

interface Props {
  data: string
  size?: number
}

export function QRCodeDisplay({ data, size = 256 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 2,
      color: theme === 'dark'
        ? { dark: '#ffffff', light: '#00000000' }
        : { dark: '#000000', light: '#ffffff' },
    })
  }, [data, size, theme])

  return (
    <div className="flex items-center justify-center rounded-xl border border-border bg-card p-4">
      <canvas ref={canvasRef} />
    </div>
  )
}
