import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady]         = useState(false)
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when detectSessionInUrl:true and the
    // URL contains a recovery token. We wait for it before showing the form.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // Also check if there's already an active recovery session on mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { error: sbError } = await supabase.auth.updateUser({ password })
      if (sbError) throw sbError
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch {
      setError('Could not update password. The link may have expired - request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-text-primary">TalentFlow</span>
        </div>

        {success ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              Password updated. Redirecting you to sign in...
            </div>
          </div>
        ) : !ready ? (
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-text-primary">Reset password</h2>
            <p className="text-text-secondary text-sm">Verifying your reset link...</p>
            <Loader2 size={20} className="animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-text-primary">Choose a new password</h2>
              <p className="text-text-secondary text-sm">Must be at least 6 characters.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    className={cn(
                      'w-full px-3.5 py-2.5 pr-10 rounded-input bg-surface-overlay border text-text-primary text-sm',
                      'placeholder:text-text-muted transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
                      error ? 'border-rose-500' : 'border-surface-border'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm" className="block text-sm font-medium text-text-secondary">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-input bg-surface-overlay border text-text-primary text-sm',
                    'placeholder:text-text-muted transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
                    error ? 'border-rose-500' : 'border-surface-border'
                  )}
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-rose-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-input',
                  'bg-accent hover:bg-accent-hover text-white font-medium text-sm',
                  'transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base',
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
