import { useNavigate } from 'react-router-dom'
import { Briefcase, Users, TrendingUp, CheckCircle2, Plus, Columns3 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats } from '@/hooks/useProfiles'
import { StageBadge } from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import type { Candidate } from '@/types'

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  loading?: boolean
}

function StatCard({ label, value, icon, color, loading }: StatCardProps) {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <span className="text-3xl font-bold text-text-primary tabular-nums">{value}</span>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { data: stats, isLoading } = useDashboardStats()

  return (
    <div className="p-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome back, {profile?.full_name.split(' ')[0]}
        </h1>
        <p className="text-text-muted text-sm mt-1">
          {isAdmin ? "Here's what's happening across all accounts." : "Here's your hiring pipeline at a glance."}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Open Jobs"
          value={stats?.open_jobs ?? 0}
          icon={<Briefcase size={16} />}
          color="#6366F1"
          loading={isLoading}
        />
        <StatCard
          label="Total Candidates"
          value={stats?.total_candidates ?? 0}
          icon={<Users size={16} />}
          color="#8B5CF6"
          loading={isLoading}
        />
        <StatCard
          label="In Interview"
          value={stats?.in_interview ?? 0}
          icon={<TrendingUp size={16} />}
          color="#F59E0B"
          loading={isLoading}
        />
        <StatCard
          label="Hired"
          value={stats?.hired_count ?? 0}
          icon={<CheckCircle2 size={16} />}
          color="#22C55E"
          loading={isLoading}
        />
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-3 mb-8">
        <Button leftIcon={<Plus size={15} />} onClick={() => navigate('/jobs')}>
          Post a Job
        </Button>
        <Button variant="secondary" leftIcon={<Users size={15} />} onClick={() => navigate('/candidates')}>
          Add Candidate
        </Button>
        <Button variant="ghost" leftIcon={<Columns3 size={15} />} onClick={() => navigate('/kanban')}>
          Open Kanban
        </Button>
      </div>

      {/* Recent candidates */}
      {stats?.recent_candidates && stats.recent_candidates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Recent Candidates</h2>
            <button
              onClick={() => navigate('/candidates')}
              className="text-xs text-accent hover:text-accent-light transition-colors"
            >
              View all
            </button>
          </div>
          <div className="bg-surface-raised border border-surface-border rounded-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Candidate</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3 hidden sm:table-cell">Job</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Stage</th>
                  <th className="text-left text-xs font-medium text-text-muted px-4 py-3 hidden md:table-cell">Added</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_candidates.map((c: Candidate) => (
                  <tr
                    key={c.id}
                    className="border-b border-surface-border last:border-0 hover:bg-surface-overlay cursor-pointer transition-colors"
                    onClick={() => navigate(`/candidates/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.full_name} size="xs" />
                        <span className="text-sm text-text-primary font-medium">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-text-secondary">{c.job_title ?? '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge stage={c.stage} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-text-muted">{formatDate(c.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
