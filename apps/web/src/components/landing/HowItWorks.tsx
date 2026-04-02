export function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Download',
      description: 'Install the PocketDev iOS app on your iPad',
    },
    {
      number: '2',
      title: 'Install',
      description: 'Run one command to install the PocketDev agent on your Linux server',
    },
    {
      number: '3',
      title: 'Open Setup',
      description: 'Open the setup page on your server and get your pairing code',
    },
    {
      number: '4',
      title: 'Pair',
      description: 'Pair your iPad with your server using the IP address and setup code',
    },
    {
      number: '5',
      title: 'Develop',
      description:
        'Start tasks, inspect logs, review diffs, and manage React work from an iPad workspace',
    },
  ]

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground mb-12">
          How it works
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-muted text-lg font-bold text-foreground mb-4">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
