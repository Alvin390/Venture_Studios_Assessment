import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useKanban, useOptimisticStageMove } from '@/hooks/useKanban'
import { useJobs } from '@/hooks/useJobs'
import KanbanColumn from '@/components/kanban/KanbanColumn'
import CandidateCard from '@/components/kanban/CandidateCard'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Candidate, CandidateStage } from '@/types'
import { ALL_STAGES } from '@/types'

export default function KanbanPage() {
  const navigate = useNavigate()
  const [jobFilter, setJobFilter] = useState('')
  const [search, setSearch] = useState('')
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null)

  const { data, isLoading } = useKanban({ job_id: jobFilter })
  const { data: jobsData } = useJobs()
  const moveStage = useOptimisticStageMove()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const candidate = event.active.data.current?.candidate as Candidate | undefined
    if (candidate) setActiveCandidate(candidate)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCandidate(null)
    const { active, over } = event
    if (!over) return

    const candidateId = active.id as string
    const newStage = over.id as CandidateStage
    const currentStage = active.data.current?.stage as CandidateStage

    if (!ALL_STAGES.includes(newStage) || newStage === currentStage) return

    moveStage.mutate({ id: candidateId, stage: newStage })
  }

  function handleDragCancel() {
    setActiveCandidate(null)
  }

  const jobOptions = [
    { value: '', label: 'All Jobs' },
    ...(jobsData?.results ?? []).map((j) => ({ value: j.id, label: j.title })),
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="flex-shrink-0 px-8 py-4 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Kanban Board</h1>
            <p className="text-xs text-text-muted mt-0.5">
              {data
                ? `${Object.values(data.stages).reduce((s, col) => s + col.count, 0)} candidates total`
                : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-52">
              <Input
                placeholder="Filter by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search size={13} />}
              />
            </div>
            <div className="flex items-center gap-1.5 text-text-muted">
              <SlidersHorizontal size={13} />
            </div>
            <Select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              options={jobOptions}
              className="w-44"
            />
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full px-8 py-5">
          {isLoading ? (
            <div className="flex gap-4 h-full">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="w-64 flex-shrink-0 space-y-2">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-card" />
                  <Skeleton className="h-24 w-full rounded-card" />
                </div>
              ))}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="flex gap-4 h-full">
                {ALL_STAGES.map((stage) => {
                  const stageData = data?.stages[stage] ?? { count: 0, candidates: [] }
                  return (
                    <KanbanColumn
                      key={stage}
                      stage={stage}
                      candidates={stageData.candidates as Candidate[]}
                      count={stageData.count}
                      searchTerm={search}
                      onCardClick={(c) => navigate(`/candidates/${c.id}`)}
                    />
                  )
                })}
              </div>

              <DragOverlay>
                {activeCandidate && (
                  <CandidateCard candidate={activeCandidate} isDragOverlay />
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  )
}
