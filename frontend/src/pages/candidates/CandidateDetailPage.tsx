import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Linkedin, ExternalLink, Mail, Phone,
  Edit2, Sparkles, Clock, ChevronRight,
  CheckCircle, XCircle, HelpCircle,
} from 'lucide-react'
import { useCandidate, useUpdateCandidate, useMoveStage, useEvaluateCandidate } from '@/hooks/useCandidates'
import { useJobs } from '@/hooks/useJobs'
import { StageBadge, ScoreBadge } from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import SlideOver from '@/components/shared/SlideOver'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, timeAgo, STAGE_LABELS, STAGE_COLORS } from '@/lib/utils'
import { STAGE_ORDER, ALL_STAGES } from '@/types'
import type { CandidateStage, CandidateActivity } from '@/types'

const ACTION_LABELS: Record<string, string> = {
  created:      'Added to pipeline',
  stage_change: 'Moved stage',
  note_added:   'Updated notes',
  ai_evaluated: 'AI evaluation completed',
}

function ActivityItem({ activity }: { activity: CandidateActivity }) {
  const label = ACTION_LABELS[activity.action] ?? activity.action

  return (
    <div className="flex gap-3 text-sm">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-surface-overlay border border-surface-border flex items-center justify-center flex-shrink-0">
          <Clock size={11} className="text-text-muted" />
        </div>
        <div className="w-px flex-1 bg-surface-border mt-1" />
      </div>
      <div className="pb-4 min-w-0">
        <p className="text-text-secondary">
          <span className="font-medium text-text-primary">{activity.actor_name}</span>
          {' '}{label}
          {activity.action === 'stage_change' && activity.metadata && (
            <span className="inline-flex items-center gap-1 ml-1">
              <span className="text-text-muted text-xs">{STAGE_LABELS[activity.metadata.from as CandidateStage]}</span>
              <ChevronRight size={10} className="text-text-muted" />
              <span className="text-text-muted text-xs">{STAGE_LABELS[activity.metadata.to as CandidateStage]}</span>
            </span>
          )}
          {activity.action === 'ai_evaluated' && activity.metadata?.score !== undefined && (
            <span className="ml-1 text-text-muted text-xs">Score: {activity.metadata.score as number}</span>
          )}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{timeAgo(activity.created_at)}</p>
      </div>
    </div>
  )
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: candidate, isLoading } = useCandidate(id!)
  const { data: jobsData } = useJobs()
  const updateCandidate = useUpdateCandidate(id!)
  const moveStage = useMoveStage()
  const evaluate = useEvaluateCandidate(id!)

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', linkedin_url: '', cv_url: '', notes: '', job: '' })

  function openEdit() {
    if (!candidate) return
    setForm({
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      linkedin_url: candidate.linkedin_url,
      cv_url: candidate.cv_url,
      notes: candidate.notes,
      job: candidate.job ?? '',
    })
    setEditOpen(true)
  }

  async function handleSave() {
    await updateCandidate.mutateAsync({ ...form, job: form.job || null })
    setEditOpen(false)
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted">Candidate not found.</p>
        <Button variant="ghost" className="mt-3" onClick={() => navigate('/candidates')}>
          Back to Candidates
        </Button>
      </div>
    )
  }

  const stageIndex = STAGE_ORDER.indexOf(candidate.stage)
  const isRejected = candidate.stage === 'rejected'

  return (
    <div className="p-8 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate('/candidates')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Candidates
      </button>

      {/* Profile header */}
      <div className="bg-surface-raised border border-surface-border rounded-card p-6 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={candidate.full_name} size="lg" />
            <div>
              <h1 className="text-xl font-bold text-text-primary">{candidate.full_name}</h1>
              {candidate.job_title && (
                <p className="text-sm text-text-secondary mt-0.5">{candidate.job_title}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StageBadge stage={candidate.stage} />
                {candidate.ai_score !== null && <ScoreBadge score={candidate.ai_score} />}
                {candidate.ai_verdict && (
                  <span className="text-xs text-text-muted">{candidate.ai_verdict}</span>
                )}
              </div>
            </div>
          </div>
          <Button variant="secondary" size="sm" leftIcon={<Edit2 size={13} />} onClick={openEdit}>
            Edit
          </Button>
        </div>

        {/* Contact row */}
        <div className="flex items-center gap-5 mt-4 pt-4 border-t border-surface-border flex-wrap">
          {candidate.email && (
            <a href={`mailto:${candidate.email}`} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
              <Mail size={13} /> {candidate.email}
            </a>
          )}
          {candidate.phone && (
            <span className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Phone size={13} /> {candidate.phone}
            </span>
          )}
          {candidate.linkedin_url && (
            <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-[#0A66C2] transition-colors">
              <Linkedin size={13} /> LinkedIn
            </a>
          )}
          {candidate.cv_url && (
            <a href={candidate.cv_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors">
              <ExternalLink size={13} /> Resume / CV
            </a>
          )}
          <span className="text-xs text-text-muted ml-auto">Added {formatDate(candidate.created_at)}</span>
        </div>
      </div>

      {/* Stage pipeline progress */}
      {!isRejected && (
        <div className="bg-surface-raised border border-surface-border rounded-card p-5 mb-5">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Pipeline Stage</h2>
          <div className="flex items-center gap-1">
            {STAGE_ORDER.map((s, i) => {
              const isPast = i < stageIndex
              const isCurrent = i === stageIndex
              const color = STAGE_COLORS[s]
              return (
                <div key={s} className="flex items-center flex-1 min-w-0">
                  <button
                    onClick={() => moveStage.mutate({ id: candidate.id, stage: s })}
                    disabled={moveStage.isPending}
                    title={`Move to ${STAGE_LABELS[s]}`}
                    className="flex flex-col items-center gap-1 group flex-1 min-w-0"
                  >
                    <div
                      className="w-full h-1.5 rounded-full transition-all"
                      style={{
                        backgroundColor: isPast || isCurrent ? color : '#252836',
                        opacity: isPast ? 0.5 : 1,
                      }}
                    />
                    <span
                      className={`text-[10px] font-medium hidden sm:block truncate w-full text-center transition-colors ${isCurrent ? '' : 'text-text-muted group-hover:text-text-secondary'}`}
                      style={isCurrent ? { color } : {}}
                    >
                      {STAGE_LABELS[s]}
                    </span>
                  </button>
                  {i < STAGE_ORDER.length - 1 && <div className="w-1 flex-shrink-0" />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isRejected && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-card p-4 mb-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-rose-400 text-sm">✕</span>
          </div>
          <div>
            <p className="text-sm font-medium text-rose-400">Candidate Rejected</p>
            <p className="text-xs text-text-muted mt-0.5">
              You can still move them to another stage using the quick action below.
            </p>
          </div>
          <Select
            value="rejected"
            onChange={(e) => moveStage.mutate({ id: candidate.id, stage: e.target.value as CandidateStage })}
            options={ALL_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
            className="ml-auto w-36"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Notes */}
        <div className="lg:col-span-3 bg-surface-raised border border-surface-border rounded-card p-5">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Notes</h2>
          {candidate.notes ? (
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{candidate.notes}</p>
          ) : (
            <p className="text-sm text-text-muted italic">No notes yet. Edit the candidate to add some.</p>
          )}
        </div>

        {/* AI Evaluation */}
        <div className="lg:col-span-2 bg-surface-raised border border-surface-border rounded-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">AI Evaluation</h2>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Sparkles size={12} />}
              onClick={() => evaluate.mutate()}
              loading={evaluate.isPending}
            >
              {candidate.ai_score !== null ? 'Re-run' : 'Evaluate'}
            </Button>
          </div>

          {evaluate.isPending && (
            <div className="flex flex-col items-center py-6 gap-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-text-muted">Analyzing candidate...</p>
            </div>
          )}

          {!evaluate.isPending && candidate.ai_score !== null ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <ScoreBadge score={candidate.ai_score} />
                <span className="text-sm font-semibold text-text-primary capitalize">
                  {candidate.ai_verdict.replace('_', ' ')}
                </span>
              </div>

              <p className="text-sm text-text-secondary leading-relaxed">{candidate.ai_summary}</p>

              {candidate.ai_strengths.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1.5">Strengths</p>
                  <ul className="space-y-1">
                    {candidate.ai_strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                        <CheckCircle size={11} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {candidate.ai_gaps.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1.5">Gaps</p>
                  <ul className="space-y-1">
                    {candidate.ai_gaps.map((g, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                        <XCircle size={11} className="text-rose-400 mt-0.5 flex-shrink-0" />
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {candidate.ai_interview_questions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1.5">Suggested Questions</p>
                  <ul className="space-y-1.5">
                    {candidate.ai_interview_questions.map((q, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
                        <HelpCircle size={11} className="text-accent mt-0.5 flex-shrink-0" />
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[10px] text-text-muted pt-1 border-t border-surface-border">
                Evaluated {formatDate(candidate.ai_evaluated_at)}
              </p>
            </div>
          ) : !evaluate.isPending && (
            <div className="text-center py-6">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles size={16} className="text-accent" />
              </div>
              <p className="text-sm text-text-secondary font-medium mb-1">Not yet evaluated</p>
              <p className="text-xs text-text-muted">
                Run an AI evaluation to get a fit score, strengths, gaps, and interview questions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Activity feed */}
      {candidate.activities && candidate.activities.length > 0 && (
        <div className="mt-5 bg-surface-raised border border-surface-border rounded-card p-5">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Activity</h2>
          <div>
            {candidate.activities.map((activity, idx) => (
              <div key={activity.id} className={idx === candidate.activities.length - 1 ? '[&>div>div:last-child]:hidden' : ''}>
                <ActivityItem activity={activity} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit slide-over */}
      <SlideOver
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Candidate"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={updateCandidate.isPending}>Save Changes</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <Input label="LinkedIn URL" value={form.linkedin_url} onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} />
          <Input label="CV / Resume URL" value={form.cv_url} onChange={(e) => setForm((f) => ({ ...f, cv_url: e.target.value }))} />
          <Select
            label="Job"
            value={form.job}
            onChange={(e) => setForm((f) => ({ ...f, job: e.target.value }))}
            options={[{ value: '', label: 'No specific job' }, ...(jobsData?.results ?? []).map((j) => ({ value: j.id, label: j.title }))]}
          />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={5} />
        </div>
      </SlideOver>
    </div>
  )
}
