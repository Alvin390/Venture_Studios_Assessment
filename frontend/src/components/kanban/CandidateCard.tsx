import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Link2, GripVertical } from 'lucide-react'
import { cn, timeAgo, STAGE_COLORS } from '@/lib/utils'
import { ScoreBadge } from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import type { Candidate } from '@/types'

interface CandidateCardProps {
  candidate: Candidate
  onClick?: () => void
  isDragOverlay?: boolean
}

export default function CandidateCard({
  candidate,
  onClick,
  isDragOverlay = false,
}: CandidateCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: candidate.id,
    data: { stage: candidate.stage, candidate },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group bg-surface-raised border border-surface-border rounded-card p-3',
        'transition-all cursor-pointer select-none',
        isDragging && !isDragOverlay ? 'opacity-40 scale-95' : 'opacity-100',
        isDragOverlay
          ? 'shadow-modal rotate-1 scale-105 border-accent/40'
          : 'hover:border-surface-border/80 hover:shadow-card-hover'
      )}
      onClick={!isDragging ? onClick : undefined}
    >
      <div className="flex items-start gap-2.5">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 p-0.5 text-text-muted opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity flex-shrink-0 touch-none"
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </div>

        <Avatar name={candidate.full_name} size="sm" className="flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate leading-tight">
            {candidate.full_name}
          </p>
          {candidate.job_title && (
            <p className="text-xs text-text-muted truncate mt-0.5">{candidate.job_title}</p>
          )}
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between mt-2.5 ml-[calc(14px+10px+6px)]">
        <div className="flex items-center gap-1.5">
          {candidate.linkedin_url && (
            <a
              href={candidate.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn profile"
              onClick={(e) => e.stopPropagation()}
              className="text-text-muted hover:text-[#0A66C2] transition-colors"
            >
              <Link2 size={13} />
            </a>
          )}
          {candidate.ai_score !== null && (
            <ScoreBadge score={candidate.ai_score} />
          )}
        </div>
        <span className="text-[10px] text-text-muted tabular-nums">
          {timeAgo(candidate.created_at)}
        </span>
      </div>

      {/* Stage color accent line at the bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-card opacity-60"
        style={{ backgroundColor: STAGE_COLORS[candidate.stage] }}
      />
    </div>
  )
}
