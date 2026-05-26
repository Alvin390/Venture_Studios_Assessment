import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Job, PaginatedResponse } from '@/types'
import toast from 'react-hot-toast'

export const JOB_KEYS = {
  all: ['jobs'] as const,
  list: (params?: Record<string, string>) => [...JOB_KEYS.all, params] as const,
  detail: (id: string) => [...JOB_KEYS.all, id] as const,
}

interface JobFilters {
  status?: string
  search?: string
}

export function useJobs(filters: JobFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)

  return useQuery({
    queryKey: JOB_KEYS.list(filters as Record<string, string>),
    queryFn: () =>
      api.get<PaginatedResponse<Job>>(`/jobs/?${params}`).then((r) => r.data),
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: JOB_KEYS.detail(id),
    queryFn: () => api.get<Job>(`/jobs/${id}/`).then((r) => r.data),
    enabled: !!id,
  })
}

interface JobFormData {
  title: string
  department?: string
  location?: string
  description?: string
  status?: string
}

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: JobFormData) =>
      api.post<Job>('/jobs/', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOB_KEYS.all })
      toast.success('Job posted.')
    },
  })
}

export function useUpdateJob(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<JobFormData>) =>
      api.patch<Job>(`/jobs/${id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOB_KEYS.all })
      toast.success('Job updated.')
    },
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/jobs/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOB_KEYS.all })
      toast.success('Job deleted.')
    },
  })
}
