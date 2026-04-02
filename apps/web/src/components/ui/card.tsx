import * as React from "react"

import { cn } from "#/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card relative isolate flex flex-col gap-4 overflow-hidden rounded-[1.75rem] border border-white/20 bg-card/70 py-4 text-sm text-card-foreground shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl ring-1 ring-inset ring-white/55 supports-[backdrop-filter]:bg-card/55 dark:border-white/10 dark:shadow-[0_28px_70px_-36px_rgba(0,0,0,0.72)] dark:ring-white/12 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-20 before:rounded-b-[2rem] before:bg-linear-to-b before:from-white/95 before:to-transparent before:opacity-80 before:content-[''] after:pointer-events-none after:absolute after:right-[-12%] after:top-[-28%] after:size-44 after:rounded-full after:bg-primary/15 after:blur-3xl after:content-[''] dark:before:from-white/18 dark:after:bg-primary/18 *:[img:first-child]:rounded-t-[1.75rem] *:[img:last-child]:rounded-b-[1.75rem]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header relative z-10 grid auto-rows-min items-start gap-1 rounded-t-[1.75rem] px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:border-white/20 [.border-b]:pb-4 dark:[.border-b]:border-white/10 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-semibold tracking-[-0.02em] group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground/95", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("relative z-10 px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "relative z-10 flex items-center rounded-b-[1.75rem] border-t border-white/25 bg-white/30 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/8 group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
