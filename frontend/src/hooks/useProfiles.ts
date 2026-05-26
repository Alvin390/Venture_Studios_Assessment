import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Profile, DashboardStats } from '@/types'
import toast from 'react-hot-toast'

export const PROFILE_KEYS = {
  all: ['profiles'] as const,
  stats: ['stats'] as const,
}

export function useProfiles() {
  return useQuery({
    queryKey: PROFILE_KEYS.all,
    queryFn: () =>
      api.get<Profile[]>('/admin/accounts/').then((r) => r.data),
  })
}

export function useDashboardStats() {
  return useQuery({
    queryKey: PROFILE_KEYS.stats,
    queryFn: () =>
      api.get<DashboardStats>('/auth/stats/').then((r) => r.data),
    staleTime: 60_000,
  })
}

interface CreateAccountData {
  email: string
  password: string
  full_name: string
  role: 'admin' | 'customer'
  company?: string
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAccountData) =>
      api.post<Profile>('/admin/accounts/', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEYS.all })
      toast.success('Account created successfully.')
    },
  })
}

export function useDeactivateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/accounts/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEYS.all })
      toast.success('Account deactivated.')
    },
  })
}
