import { Component, type ErrorInfo, type ReactNode } from 'react'
import Button from '@/components/ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-surface-base p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-rose-400 text-2xl">!</span>
            </div>
            <h1 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h1>
            <p className="text-sm text-text-muted mb-6">
              An unexpected error occurred. Refresh the page to try again.
            </p>
            <Button onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
