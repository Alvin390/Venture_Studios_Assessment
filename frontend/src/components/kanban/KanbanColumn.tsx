import { useDroppable } from '@dnd-kit/core'
import { cn, STAGE_LABELS, STAGE_COLORS } from '@/lib/utils'
import CandidateCard from './CandidateCard'
import type { Candidate, CandidateStage } from '@/types'

interface KanbanColumnProps {
  stage: CandidateStage
  candidates: Candidate[]
  count: number
  searchTerm: string
  onCardClick: (candidate: Candidate) => void
}

export default function KanbanColumn({
  stage,
  candidates,
  count,
  searchTerm,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const filtered = searchTerm
    ? candidates.filter((c) =>
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : candidates

  const color = STAGE_COLORS[stage]

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 mb-2 rounded-lg border"
        style={{
          backgroundColor: `${color}10`,
          borderColor: `${color}30`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-semibold" style={{ color }}>
            {STAGE_LABELS[stage]}
          </span>
        </div>
        <span
          className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {count}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 flex flex-col gap-2 min-h-[120px] rounded-lg p-2 transition-colors',
          isOver
            ? 'bg-accent-muted border-2 border-dashed border-accent/40'
            : 'border-2 border-dashed border-transparent'
        )}
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-text-muted">
            {searchTerm ? 'No matches' : 'Drop here'}
          </div>
        ) : (
          filtered.map((candidate) => (
            <div key={candidate.id} className="relative">
              <CandidateCard
                candidate={candidate}
                onClick={() => onCardClick(candidate)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
