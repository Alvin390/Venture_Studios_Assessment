import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Candidate, PaginatedResponse, CandidateStage, AIEvaluationResult } from '@/types'
import toast from 'react-hot-toast'

export const CANDIDATE_KEYS = {
  all: ['candidates'] as const,
  list: (params?: Record<string, string>) => [...CANDIDATE_KEYS.all, 'list', params] as const,
  detail: (id: string) => [...CANDIDATE_KEYS.all, id] as const,
  kanban: (params?: Record<string, string>) => [...CANDIDATE_KEYS.all, 'kanban', params] as const,
}

interface CandidateFilters {
  job_id?: string
  stage?: string
  search?: string
}

export function useCandidates(filters: CandidateFilters = {}) {
  const params = new URLSearchParams()
  if (filters.job_id) params.set('job_id', filters.job_id)
  if (filters.stage) params.set('stage', filters.stage)
  if (filters.search) params.set('search', filters.search)

  return useQuery({
    queryKey: CANDIDATE_KEYS.list(filters as Record<string, string>),
    queryFn: () =>
      api.get<PaginatedResponse<Candidate>>(`/candidates/?${params}`).then((r) => r.data),
  })
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: CANDIDATE_KEYS.detail(id),
    queryFn: () => api.get<Candidate>(`/candidates/${id}/`).then((r) => r.data),
    enabled: !!id,
  })
}

interface CandidateFormData {
  job?: string | null
  full_name: string
  email?: string
  phone?: string
  linkedin_url?: string
  cv_url?: string
  stage?: CandidateStage
  notes?: string
}

export function useCreateCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CandidateFormData) =>
      api.post<Candidate>('/candidates/', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.all })
      toast.success('Candidate added.')
    },
  })
}

export function useUpdateCandidate(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CandidateFormData>) =>
      api.patch<Candidate>(`/candidates/${id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.all })
      toast.success('Candidate updated.')
    },
  })
}

export function useDeleteCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/candidates/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.all })
      toast.success('Candidate removed.')
    },
  })
}

export function useMoveStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: CandidateStage }) =>
      api.patch<Candidate>(`/candidates/${id}/stage/`, { stage }).then((r) => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.all })
      qc.setQueryData(CANDIDATE_KEYS.detail(updated.id), updated)
    },
    onError: () => {
      toast.error('Failed to move candidate. Try again.')
    },
  })
}

export function useEvaluateCandidate(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<AIEvaluationResult>(`/candidates/${id}/evaluate/`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CANDIDATE_KEYS.detail(id) })
      toast.success('AI evaluation complete.')
    },
    onError: () => {
      toast.error('Evaluation failed. Please try again.')
    },
  })
}
