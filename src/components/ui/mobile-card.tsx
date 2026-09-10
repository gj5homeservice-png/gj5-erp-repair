import * as React from "react"
import { cn } from "@/lib/utils"

// The mobile-only counterpart to <Table>: every module's data list renders
// its existing desktop <Table> unchanged (wrapped in `hidden md:block`) and,
// alongside it, a `md:hidden` stack of these cards built from the exact same
// row data — so there is never a second data path, only a second view of
// the same rows. Purely presentational; each module decides which fields to
// show and in what order.

export function MobileCardList({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("md:hidden space-y-3", className)}>{children}</div>
}

export function MobileCard({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3",
        onClick && "cursor-pointer active:bg-slate-800/40",
        className
      )}
    >
      {children}
    </div>
  )
}

// Header row of a card: the record's primary identifier (e.g. Job ID) plus
// an optional status badge, and/or a leading avatar/icon slot.
export function MobileCardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex items-start justify-between gap-3", className)}>{children}</div>
}

// A single label/value line inside a card body. `value` can be any node
// (text, a Badge, a colored span) — this just handles the label + layout.
// `noTruncate` opts a specific row out of the default single-line ellipsis
// (e.g. a long brand/model code) — it wraps onto multiple lines instead of
// ever being cut off, while every other existing call site (which doesn't
// pass it) keeps the exact same truncating behavior as before.
export function MobileCardRow({
  label,
  value,
  className,
  noTruncate,
}: {
  label: string
  value: React.ReactNode
  className?: string
  noTruncate?: boolean
}) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className={cn("flex items-start justify-between gap-3 text-xs", className)}>
      <span className="text-slate-500 uppercase font-bold tracking-wide shrink-0 pt-px">{label}</span>
      {/* min-w-0 is load-bearing: without it, a flex item's default auto
          min-width is its unbroken content width, so neither truncate's
          ellipsis nor break-words' wrapping ever actually engages — the
          text just overflows the card instead. */}
      <span className={cn("min-w-0 flex-1 text-slate-200 font-medium text-right", noTruncate ? "break-words" : "truncate")}>{value}</span>
    </div>
  )
}

// Action button row pinned to the bottom of a card — wraps instead of
// overflowing when there are more actions than fit on one line, so nothing
// is ever pushed outside the viewport.
export function MobileCardActions({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 pt-2 mt-1 border-t border-slate-800/80", className)}>
      {children}
    </div>
  )
}
