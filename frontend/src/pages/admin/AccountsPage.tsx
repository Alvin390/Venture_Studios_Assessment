import { useState } from 'react'
import { UserPlus, Users, Eye, EyeOff, ShieldCheck, User } from 'lucide-react'
import { useProfiles, useCreateAccount, useDeactivateAccount } from '@/hooks/useProfiles'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import PageHeader from '@/components/shared/PageHeader'
import { SkeletonRow } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import type { Profile } from '@/types'

interface FormState {
  email: string; password: string; full_name: string
  role: 'admin' | 'customer'; company: string
}

const EMPTY: FormState = { email: '', password: '', full_name: '', role: 'customer', company: '' }

export default function AccountsPage() {
  const { data: profiles, isLoading } = useProfiles()
  const createAccount = useCreateAccount()
  const deactivateAccount = useDeactivateAccount()

  const [modalOpen, setModalOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<Profile | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<Partial<FormState>>({})

  function validate() {
    const e: Partial<FormState> = {}
    if (!form.email.trim()) e.email = 'Email is required.'
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (!form.full_name.trim()) e.full_name = 'Name is required.'
    return e
  }

  async function handleCreate() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    try {
      await createAccount.mutateAsync(form)
      setModalOpen(false)
      setForm(EMPTY)
    } catch (err) {
      setErrors({ email: getErrorMessage(err) })
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Accounts"
        description="Manage admin and customer accounts."
        actions={
          <Button
            leftIcon={<UserPlus size={15} />}
            onClick={() => { setForm(EMPTY); setErrors({}); setModalOpen(true) }}
          >
            Create Account
          </Button>
        }
      />

      <div className="bg-surface-raised border border-surface-border rounded-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3">User</th>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Role</th>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3 hidden md:table-cell">Company</th>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3 hidden lg:table-cell">Status</th>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3 hidden xl:table-cell">Created</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><SkeletonRow /></td></tr>
                ))
              : !profiles || profiles.length === 0
              ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={<Users size={20} />}
                        title="No accounts yet"
                        description="Create the first account to get started."
                        action={{ label: 'Create Account', onClick: () => setModalOpen(true) }}
                      />
                    </td>
                  </tr>
                )
              : profiles.map((p) => (
                  <tr key={p.id} className="border-b border-surface-border last:border-0 hover:bg-surface-overlay transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.full_name} size="xs" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{p.full_name}</p>
                          <p className="text-xs text-text-muted">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                        {p.role === 'admin'
                          ? <><ShieldCheck size={12} className="text-accent" /> Admin</>
                          : <><User size={12} /> Customer</>
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-text-muted">
                      {p.company || '-'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs font-medium ${p.is_active ? 'text-emerald-400' : 'text-text-muted'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-text-muted">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active && (
                        <button
                          onClick={() => setDeactivateTarget(p)}
                          className="text-xs text-text-muted hover:text-rose-400 transition-colors"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Account"
        description="Set up a new admin or customer account."
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            required
            placeholder="Jane Smith"
            value={form.full_name}
            onChange={(e) => { setForm((f) => ({ ...f, full_name: e.target.value })); setErrors({}) }}
            error={errors.full_name}
          />
          <Input
            label="Email"
            type="email"
            required
            placeholder="jane@company.com"
            value={form.email}
            onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setErrors({}) }}
            error={errors.email}
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPw ? 'text' : 'password'}
              required
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); setErrors({}) }}
              error={errors.password}
              rightIcon={
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-text-muted hover:text-text-secondary">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
          </div>
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'customer' }))}
            options={[
              { value: 'customer', label: 'Customer' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          {form.role === 'customer' && (
            <Input
              label="Company"
              placeholder="Company name"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={createAccount.isPending}>Create Account</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={async () => {
          if (deactivateTarget) await deactivateAccount.mutateAsync(deactivateTarget.id)
          setDeactivateTarget(null)
        }}
        title="Deactivate Account"
        description={`Deactivate ${deactivateTarget?.full_name}'s account? They will no longer be able to sign in.`}
        confirmLabel="Deactivate"
        loading={deactivateAccount.isPending}
      />
    </div>
  )
}
