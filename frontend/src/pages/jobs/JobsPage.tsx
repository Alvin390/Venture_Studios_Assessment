import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Briefcase, MapPin, Users, Search } from 'lucide-react'
import { useJobs, useCreateJob, useUpdateJob, useDeleteJob } from '@/hooks/useJobs'
import { StatusBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import SlideOver from '@/components/shared/SlideOver'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import PageHeader from '@/components/shared/PageHeader'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import type { Job, JobStatus } from '@/types'

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Draft', value: 'draft' },
  { label: 'Closed', value: 'closed' },
]

interface JobFormState {
  title: string
  department: string
  location: string
  description: string
  status: JobStatus
}

const EMPTY_FORM: JobFormState = {
  title: '',
  department: '',
  location: '',
  description: '',
  status: 'open',
}

export default function JobsPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editJob, setEditJob] = useState<Job | null>(null)
  const [deleteJob, setDeleteJob] = useState<Job | null>(null)
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<JobFormState>>({})

  const { data, isLoading } = useJobs({ status: statusFilter, search: debouncedSearch })
  const createJob = useCreateJob()
  const updateJob = useUpdateJob(editJob?.id ?? '')
  const deleteJobMut = useDeleteJob()

  // Debounce search
  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    clearTimeout(window._searchTimer)
    window._searchTimer = window.setTimeout(() => setDebouncedSearch(val), 300)
  }, [])

  function openCreate() {
    setEditJob(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setPanelOpen(true)
  }

  function openEdit(job: Job) {
    setEditJob(job)
    setForm({
      title: job.title,
      department: job.department,
      location: job.location,
      description: job.description,
      status: job.status,
    })
    setErrors({})
    setPanelOpen(true)
  }

  function validate() {
    const e: Partial<JobFormState> = {}
    if (!form.title.trim()) e.title = 'Title is required.'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    try {
      if (editJob) {
        await updateJob.mutateAsync(form)
      } else {
        await createJob.mutateAsync(form)
      }
      setPanelOpen(false)
    } catch (err) {
      setErrors({ title: getErrorMessage(err) })
    }
  }

  async function handleDelete() {
    if (!deleteJob) return
    await deleteJobMut.mutateAsync(deleteJob.id)
    setDeleteJob(null)
  }

  const jobs = data?.results ?? []
  const isSubmitting = createJob.isPending || updateJob.isPending

  return (
    <div className="p-8">
      <PageHeader
        title="Jobs"
        description="Manage your open positions and track candidates."
        actions={
          <Button leftIcon={<Plus size={15} />} onClick={openCreate}>
            Post a Job
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1 bg-surface-raised border border-surface-border rounded-lg p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                statusFilter === tab.value
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            leftIcon={<Search size={14} />}
          />
        </div>
      </div>

      {/* Jobs grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={20} />}
          title="No jobs yet"
          description="Post your first job to start collecting candidates."
          action={{ label: 'Post a Job', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-surface-raised border border-surface-border rounded-card p-5 flex flex-col gap-3 hover:border-surface-overlay hover:shadow-card-hover transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary truncate">{job.title}</h3>
                  {job.department && (
                    <p className="text-xs text-text-muted truncate mt-0.5">{job.department}</p>
                  )}
                </div>
                <StatusBadge status={job.status} className="flex-shrink-0" />
              </div>

              {job.location && (
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <MapPin size={12} />
                  {job.location}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-surface-border text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                  <Users size={12} />
                  {job.candidate_count} candidate{job.candidate_count !== 1 ? 's' : ''}
                </div>
                <span>{formatDate(job.created_at)}</span>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => navigate(`/candidates?job_id=${job.id}`)}
                >
                  View Candidates
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(job)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteJob(job)}
                  className="text-rose-400 hover:text-rose-300"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit slide-over */}
      <SlideOver
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editJob ? 'Edit Job' : 'Post a New Job'}
        description={editJob ? 'Update the job details below.' : 'Fill in the details for your new position.'}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setPanelOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              {editJob ? 'Save Changes' : 'Post Job'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Job Title"
            required
            placeholder="e.g. Senior Frontend Engineer"
            value={form.title}
            onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors((e2) => ({ ...e2, title: '' })) }}
            error={errors.title}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department"
              placeholder="e.g. Engineering"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            />
            <Input
              label="Location"
              placeholder="e.g. Remote"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as JobStatus }))}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'draft', label: 'Draft' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
          <Textarea
            label="Job Description"
            placeholder="Describe the role, responsibilities, and requirements..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={6}
          />
        </div>
      </SlideOver>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteJob}
        onClose={() => setDeleteJob(null)}
        onConfirm={handleDelete}
        title="Delete Job"
        description={`Delete "${deleteJob?.title}"? This won't delete the candidates attached to it, but they'll lose the job reference.`}
        confirmLabel="Delete Job"
        loading={deleteJobMut.isPending}
      />
    </div>
  )
}

declare global {
  interface Window { _searchTimer: ReturnType<typeof setTimeout> }
}