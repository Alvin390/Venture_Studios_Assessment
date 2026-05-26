import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'
import type { CandidateStage } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'MMM d, yyyy')
}

export function timeAgo(date: string | null | undefined): string {
  if (!date) return '-'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// Deterministic color from a string (for avatars)
export function colorFromName(name: string): string {
  const colors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
    '#10B981', '#3B82F6', '#06B6D4', '#84CC16',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export const STAGE_COLORS: Record<CandidateStage, string> = {
  applied:   '#3B82F6',
  screening: '#8B5CF6',
  interview: '#F59E0B',
  technical: '#06B6D4',
  offer:     '#10B981',
  hired:     '#22C55E',
  rejected:  '#F43F5E',
}

export const STAGE_LABELS: Record<CandidateStage, string> = {
  applied:   'Applied',
  screening: 'Screening',
  interview: 'Interview',
  technical: 'Technical',
  offer:     'Offer',
  hired:     'Hired',
  rejected:  'Rejected',
}

export function scoreColor(score: number | null): string {
  if (score === null) return '#94A3B8'
  if (score >= 80) return '#22C55E'
  if (score >= 60) return '#F59E0B'
  if (score >= 40) return '#3B82F6'
  return '#F43F5E'
}

export function scoreVerdict(score: number | null): string {
  if (score === null) return 'Not evaluated'
  if (score >= 80) return 'Strong Fit'
  if (score >= 60) return 'Good Fit'
  if (score >= 40) return 'Potential Fit'
  return 'Not a Fit'
}
