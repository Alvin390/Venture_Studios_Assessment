export type Role = 'admin' | 'customer'

export type JobStatus = 'open' | 'closed' | 'draft'

export type CandidateStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'technical'
  | 'offer'
  | 'hired'
  | 'rejected'

export const STAGE_ORDER: CandidateStage[] = [
  'applied',
  'screening',
  'interview',
  'technical',
  'offer',
  'hired',
]

export const ALL_STAGES: CandidateStage[] = [
  'applied',
  'screening',
  'interview',
  'technical',
  'offer',
  'hired',
  'rejected',
]

export interface Profile {
  id: string
  role: Role
  full_name: string
  email: string
  company: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  owner: string
  owner_name?: string
  title: string
  department: string
  location: string
  description: string
  status: JobStatus
  candidate_count: number
  created_at: string
  updated_at: string
}

export interface Candidate {
  id: string
  owner: string
  job: string | null
  job_title?: string | null
  full_name: string
  email: string
  phone: string
  linkedin_url: string
  cv_url: string
  stage: CandidateStage
  notes: string
  ai_score: number | null
  ai_summary: string
  ai_verdict: string
  ai_evaluated_at: string | null
  activities: CandidateActivity[]
  created_at: string
  updated_at: string
}

export interface CandidateActivity {
  id: string
  candidate: string
  actor: string
  actor_name: string
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface KanbanData {
  stages: {
    [key in CandidateStage]: {
      count: number
      candidates: Candidate[]
    }
  }
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiError {
  error: string
  code: string
  fields?: Record<string, string>
}

export interface AIEvaluationResult {
  score: number
  verdict: string
  strengths: string[]
  gaps: string[]
  summary: string
  interview_questions: string[]
  evaluated_at: string
}

export interface DashboardStats {
  total_jobs: number
  open_jobs: number
  total_candidates: number
  hired_count: number
  in_interview: number
  in_offer: number
  recent_candidates: Candidate[]
}
