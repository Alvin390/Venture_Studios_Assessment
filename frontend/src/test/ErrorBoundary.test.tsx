import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '@/components/shared/ErrorBoundary'

function BoomComponent({ explode }: { explode: boolean }) {
  if (explode) throw new Error('Intentional test error')
  return <div>All good</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error noise from the intentionally thrown errors
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <BoomComponent explode={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  test('renders error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <BoomComponent explode={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument()
  })

  test('shows a reload button when an error occurs', () => {
    render(
      <ErrorBoundary>
        <BoomComponent explode={true} />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
  })

  test('reload button calls window.location.reload', async () => {
    const user = userEvent.setup()
    const reloadMock = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload: reloadMock } as unknown as Location)

    render(
      <ErrorBoundary>
        <BoomComponent explode={true} />
      </ErrorBoundary>
    )

    await user.click(screen.getByRole('button', { name: /reload page/i }))
    expect(reloadMock).toHaveBeenCalledOnce()
  })
})
