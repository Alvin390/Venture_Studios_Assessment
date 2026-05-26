import { cn } from '@/lib/utils'

interface PageSpinnerProps {
  className?: string
}

export default function PageSpinner({ className }: PageSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-screen bg-surface-base', className)}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-accent animate-spin" />
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    </div>
  )
}
