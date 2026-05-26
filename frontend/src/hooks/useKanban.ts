import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { KanbanData, CandidateStage } from '@/types'
import { CANDIDATE_KEYS } from './useCandidates'
import toast from 'react-hot-toast'

interface KanbanFilters {
  job_id?: string
}

export function useKanban(filters: KanbanFilters = {}) {
  const params = new URLSearchParams()
  if (filters.job_id) params.set('job_id', filters.job_id)

  return useQuery({
    queryKey: CANDIDATE_KEYS.kanban(filters as Record<string, string>),
    queryFn: () =>
      api.get<KanbanData>(`/candidates/kanban/?${params}`).then((r) => r.data),
    staleTime: 0, // Kanban should always reflect current state
  })
}

export function useOptimisticStageMove() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: CandidateStage }) =>
      api.patch(`/candidates/${id}/stage/`, { stage }).then((r) => r.data),

    onMutate: async ({ id, stage: newStage }) => {
      // Cancel any in-flight kanban fetches
      await qc.cancelQueries({ queryKey: ['candidates', 'kanban'] })

      // Snapshot current kanban state for rollback
      const previousData = qc.getQueriesData<KanbanData>({ queryKey: ['candidates', 'kanban'] })

      // Optimistically update ALL matching kanban query entries
      qc.setQueriesData<KanbanData>({ queryKey: ['candidates', 'kanban'] }, (old) => {
        if (!old) return old
        const stages = { ...old.stages }

        // Find and remove from current stage
        let movedCandidate = null
        for (const [stageKey, stageData] of Object.entries(stages)) {
          const idx = stageData.candidates.findIndex((c) => c.id === id)
          if (idx !== -1) {
            movedCandidate = stageData.candidates[idx]
            stages[stageKey as CandidateStage] = {
              count: stageData.count - 1,
              candidates: stageData.candidates.filter((c) => c.id !== id),
            }
            break
          }
        }

        // Add to new stage
        if (movedCandidate) {
          const updated = { ...movedCandidate, stage: newStage }
          stages[newStage] = {
            count: (stages[newStage]?.count ?? 0) + 1,
            candidates: [...(stages[newStage]?.candidates ?? []), updated],
          }
        }

        return { stages }
      })

      return { previousData }
    },

    onError: (_err, _vars, context) => {
      // Roll back to the snapshot
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data)
        })
      }
      toast.error('Stage update failed. Changes reverted.')
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.all })
    },
  })
}
