export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-4xl items-center justify-between text-sm text-muted-foreground">
        <span>PocketDev</span>
        <span>
          Built by{' '}
          <a
            href="https://github.com/kessenmacher"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline"
          >
            Kyle Essenmacher
          </a>
        </span>
      </div>
    </footer>
  )
}
