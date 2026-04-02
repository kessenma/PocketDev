export function BackgroundFrame({ size }: { size: number }) {
  return (
    <rect
      x="0"
      y="0"
      width={size}
      height={size}
      fill="transparent"
    />
  )
}
