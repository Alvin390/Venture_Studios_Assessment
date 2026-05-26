import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-surface-overlay',
        className
      )}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-border">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="h-3.5 w-36" />
      <Skeleton className="h-3.5 w-28 ml-auto" />
      <Skeleton className="h-6 w-20 rounded-badge" />
    </div>
  )
}
