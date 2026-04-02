import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface Props {
  data: string
  size?: number
}

export function QRCodeDisplay({ data, size = 256 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 2,
      color: {
        dark: '#ffffff',
        light: '#00000000',
      },
    })
  }, [data, size])

  return (
    <div className="flex items-center justify-center rounded-xl border border-border bg-card p-4">
      <canvas ref={canvasRef} />
    </div>
  )
}
