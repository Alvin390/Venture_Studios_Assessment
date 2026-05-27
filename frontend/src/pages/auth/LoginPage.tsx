import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Zap, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const [forgotMode, setForgotMode]       = useState(false)
  const [resetEmail, setResetEmail]       = useState('')
  const [resetSent, setResetSent]         = useState(false)
  const [resetLoading, setResetLoading]   = useState(false)
  const [resetError, setResetError]       = useState('')

  if (user) {
    navigate('/dashboard', { replace: true })
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault()
    if (!resetEmail) {
      setResetError('Please enter your email address.')
      return
    }
    setResetError('')
    setResetLoading(true)
    try {
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (sbError) throw sbError
      setResetSent(true)
    } catch {
      setResetError('Could not send reset email. Check the address and try again.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-base flex">
      {/* Left - branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-surface-raised border-r border-surface-border p-12">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-text-primary">TalentFlow</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-text-primary leading-tight">
              Hire faster.<br />
              <span className="text-gradient">Track better.</span>
            </h1>
            <p className="text-text-secondary text-base leading-relaxed">
              Your entire hiring pipeline in one place. From first application to signed offer.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              'Visual kanban board for your pipeline',
              'Candidate profiles with LinkedIn sync',
              'AI-powered CV evaluation in seconds',
              'Team-wide hiring visibility',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-text-muted">
          Built for teams that move fast.
        </p>
      </div>

      {/* Right - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">

          {forgotMode ? (
            <>
              <div className="space-y-1">
                <button
                  onClick={() => { setForgotMode(false); setResetSent(false); setResetError('') }}
                  className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
                >
                  <ArrowLeft size={14} /> Back to sign in
                </button>
                <h2 className="text-2xl font-bold text-text-primary">Reset password</h2>
                <p className="text-text-secondary text-sm">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              {resetSent ? (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                  Check your inbox - a reset link is on its way.
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <label htmlFor="reset-email" className="block text-sm font-medium text-text-secondary">
                      Email address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@company.com"
                      className={cn(
                        'w-full px-3.5 py-2.5 rounded-input bg-surface-overlay border text-text-primary text-sm',
                        'placeholder:text-text-muted transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
                        resetError ? 'border-rose-500' : 'border-surface-border'
                      )}
                    />
                  </div>

                  {resetError && (
                    <p role="alert" className="text-sm text-rose-400">{resetError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-input',
                      'bg-accent hover:bg-accent-hover text-white font-medium text-sm',
                      'transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base',
                      'disabled:opacity-60 disabled:cursor-not-allowed'
                    )}
                  >
                    {resetLoading && <Loader2 size={15} className="animate-spin" />}
                    {resetLoading ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
                <p className="text-text-secondary text-sm">Sign in to your workspace</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-text-secondary">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-input bg-surface-overlay border text-text-primary text-sm',
                      'placeholder:text-text-muted transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
                      error ? 'border-rose-500' : 'border-surface-border'
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(true); setResetEmail(email) }}
                      className="text-xs text-accent hover:text-accent-hover"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
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

                {error && (
                  <p role="alert" className="text-sm text-rose-400 animate-fade-in">
                    {error}
                  </p>
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
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
