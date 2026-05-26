import { cn } from '@/lib/utils'
import { STAGE_LABELS, STAGE_COLORS } from '@/lib/utils'
import type { CandidateStage, JobStatus } from '@/types'

interface StageBadgeProps {
  stage: CandidateStage
  className?: string
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const color = STAGE_COLORS[stage]
  const label = STAGE_LABELS[stage]

  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-medium', className)}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  )
}

const STATUS_COLORS: Record<JobStatus, { bg: string; text: string; border: string }> = {
  open:   { bg: '#10B98120', text: '#10B981', border: '#10B98140' },
  closed: { bg: '#94A3B820', text: '#94A3B8', border: '#94A3B840' },
  draft:  { bg: '#F59E0B20', text: '#F59E0B', border: '#F59E0B40' },
}

interface StatusBadgeProps {
  status: JobStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status]
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-medium capitalize', className)}
      style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
    >
      {status}
    </span>
  )
}

interface ScoreBadgeProps {
  score: number | null
  className?: string
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  if (score === null) return null

  let color = '#F43F5E'
  if (score >= 80) color = '#22C55E'
  else if (score >= 60) color = '#F59E0B'
  else if (score >= 40) color = '#3B82F6'

  return (
    <span
      className={cn('inline-flex items-center px-1.5 py-0.5 rounded-badge text-xs font-semibold tabular-nums', className)}
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {score}
    </span>
  )
}
