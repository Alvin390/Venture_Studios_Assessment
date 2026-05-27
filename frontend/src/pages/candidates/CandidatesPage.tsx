import { useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus, Users, Search, Link2, ExternalLink, Upload, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCandidates, useCreateCandidate, useDeleteCandidate } from '@/hooks/useCandidates'
import { useJobs } from '@/hooks/useJobs'
import { StageBadge, ScoreBadge } from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import SlideOver from '@/components/shared/SlideOver'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import PageHeader from '@/components/shared/PageHeader'
import { SkeletonRow } from '@/components/ui/Skeleton'
import { formatDate, cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import type { Candidate, CandidateStage } from '@/types'
import { ALL_STAGES } from '@/types'
import { STAGE_LABELS } from '@/lib/utils'

interface FormState {
  full_name: string; email: string; phone: string
  linkedin_url: string; cv_url: string; notes: string
  job: string; stage: CandidateStage
}

const EMPTY: FormState = {
  full_name: '', email: '', phone: '', linkedin_url: '',
  cv_url: '', notes: '', job: '', stage: 'applied',
}

export default function CandidatesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [jobFilter, setJobFilter] = useState(searchParams.get('job_id') ?? '')
  const [stageFilter, setStageFilter] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<FormState>>({})

  const [cvMode, setCvMode] = useState<'url' | 'file'>('url')
  const [cvUploading, setCvUploading] = useState(false)
  const [cvFileName, setCvFileName] = useState('')
  const [cvUploadError, setCvUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useCandidates({
    job_id: jobFilter,
    stage: stageFilter,
    search: debouncedSearch,
  })
  const { data: jobsData } = useJobs()
  const createCandidate = useCreateCandidate()
  const deleteCandidate = useDeleteCandidate()

  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    clearTimeout(window._searchTimer)
    window._searchTimer = setTimeout(() => setDebouncedSearch(val), 300)
  }, [])

  async function handleCvUpload(file: File) {
    setCvUploading(true)
    setCvUploadError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('candidate-cvs')
        .upload(path, file, { upsert: false })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('candidate-cvs').getPublicUrl(path)
      setForm((f) => ({ ...f, cv_url: urlData.publicUrl }))
      setCvFileName(file.name)
    } catch {
      setCvUploadError('Upload failed. Make sure the candidate-cvs bucket exists in Supabase Storage.')
    } finally {
      setCvUploading(false)
    }
  }

  function validate() {
    const e: Partial<FormState> = {}
    if (!form.full_name.trim()) e.full_name = 'Name is required.'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    try {
      await createCandidate.mutateAsync({ ...form, job: form.job || null })
      setPanelOpen(false)
      setForm(EMPTY)
      setCvMode('url')
      setCvFileName('')
    } catch (err) {
      setErrors({ full_name: getErrorMessage(err) })
    }
  }

  const candidates = data?.results ?? []
  const jobOptions = [
    { value: '', label: 'All Jobs' },
    ...(jobsData?.results ?? []).map((j) => ({ value: j.id, label: j.title })),
  ]
  const stageOptions = [
    { value: '', label: 'All Stages' },
    ...ALL_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] })),
  ]

  return (
    <div className="p-8">
      <PageHeader
        title="Candidates"
        description="All candidates across your hiring pipeline."
        actions={
          <Button leftIcon={<UserPlus size={15} />} onClick={() => { setForm(EMPTY); setCvMode('url'); setCvFileName(''); setPanelOpen(true) }}>
            Add Candidate
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-48 max-w-xs">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            leftIcon={<Search size={14} />}
          />
        </div>
        <Select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          options={jobOptions}
          className="w-44"
        />
        <Select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          options={stageOptions}
          className="w-40"
        />
      </div>

      {/* Table */}
      <div className="bg-surface-raised border border-surface-border rounded-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3 hidden md:table-cell">Job</th>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Stage</th>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3 hidden lg:table-cell">Email</th>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3 hidden sm:table-cell">Score</th>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3 hidden xl:table-cell">Added</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={7}><SkeletonRow /></td></tr>
                ))
              : candidates.length === 0
              ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={<Users size={20} />}
                        title="No candidates yet"
                        description="Add your first candidate to start tracking them."
                        action={{ label: 'Add Candidate', onClick: () => setPanelOpen(true) }}
                      />
                    </td>
                  </tr>
                )
              : candidates.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-surface-border last:border-0 hover:bg-surface-overlay cursor-pointer transition-colors group"
                    onClick={() => navigate(`/candidates/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.full_name} size="xs" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{c.full_name}</p>
                          {c.linkedin_url && (
                            <a
                              href={c.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-text-muted hover:text-[#0A66C2] transition-colors"
                            >
                              <Link2 size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-text-secondary">
                      {c.job_title ?? <span className="text-text-muted">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge stage={c.stage} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm text-text-muted">
                      {c.email || '-'}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <ScoreBadge score={c.ai_score} />
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-text-muted">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <ExternalLink size={13} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Add candidate slide-over */}
      <SlideOver
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Add Candidate"
        description="Fill in the candidate's profile details."
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setPanelOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={createCandidate.isPending}>Add Candidate</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            required
            placeholder="e.g. Alex Johnson"
            value={form.full_name}
            onChange={(e) => { setForm((f) => ({ ...f, full_name: e.target.value })); setErrors({}) }}
            error={errors.full_name}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              placeholder="alex@email.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+1 234 567 8900"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <Input
            label="LinkedIn URL"
            placeholder="https://linkedin.com/in/..."
            value={form.linkedin_url}
            onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
          />

          {/* CV field with URL / Upload toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary">CV / Resume</label>
              <div className="flex rounded-md overflow-hidden border border-surface-border text-xs">
                <button
                  type="button"
                  onClick={() => setCvMode('url')}
                  className={cn(
                    'px-2.5 py-1 transition-colors',
                    cvMode === 'url'
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:text-text-secondary'
                  )}
                >
                  Paste URL
                </button>
                <button
                  type="button"
                  onClick={() => setCvMode('file')}
                  className={cn(
                    'px-2.5 py-1 transition-colors border-l border-surface-border',
                    cvMode === 'file'
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:text-text-secondary'
                  )}
                >
                  Upload file
                </button>
              </div>
            </div>

            {cvMode === 'url' ? (
              <Input
                placeholder="https://drive.google.com/..."
                value={form.cv_url}
                onChange={(e) => setForm((f) => ({ ...f, cv_url: e.target.value }))}
              />
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleCvUpload(file)
                  }}
                />
                {cvFileName && !cvUploading ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-input border border-green-500/40 bg-green-500/10 text-sm text-green-400">
                    <CheckCircle2 size={14} />
                    <span className="truncate flex-1">{cvFileName}</span>
                    <button
                      type="button"
                      onClick={() => { setCvFileName(''); setForm((f) => ({ ...f, cv_url: '' })); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="text-text-muted hover:text-text-secondary text-xs ml-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={cvUploading}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-input border border-dashed text-sm transition-colors',
                      'border-surface-border text-text-muted hover:border-accent hover:text-accent',
                      'disabled:opacity-60 disabled:cursor-not-allowed'
                    )}
                  >
                    {cvUploading
                      ? <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                      : <><Upload size={14} /> Choose PDF, DOC, or DOCX</>
                    }
                  </button>
                )}
                {cvUploadError && (
                  <p className="mt-1 text-xs text-rose-400">{cvUploadError}</p>
                )}
              </div>
            )}
          </div>

          <Select
            label="Job"
            value={form.job}
            onChange={(e) => setForm((f) => ({ ...f, job: e.target.value }))}
            options={[{ value: '', label: 'No specific job' }, ...(jobsData?.results ?? []).map((j) => ({ value: j.id, label: j.title }))]}
          />
          <Select
            label="Starting Stage"
            value={form.stage}
            onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as CandidateStage }))}
            options={ALL_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
          />
          <Textarea
            label="Notes"
            placeholder="Any initial notes about this candidate..."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
          />
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteCandidate.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
        title="Remove Candidate"
        description={`Remove ${deleteTarget?.full_name}? This cannot be undone.`}
        confirmLabel="Remove"
        loading={deleteCandidate.isPending}
      />
    </div>
  )
}
