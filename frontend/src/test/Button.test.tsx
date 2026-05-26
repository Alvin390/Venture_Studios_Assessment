import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '@/components/ui/Button'

describe('Button', () => {
  test('renders its children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  test('applies primary variant by default', () => {
    render(<Button>Save</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-accent')
  })

  test('applies secondary variant classes', () => {
    render(<Button variant="secondary">Cancel</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-surface-overlay')
  })

  test('applies destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-rose-600')
  })

  test('shows spinner and disables button when loading', () => {
    render(<Button loading>Save</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    // Spinner replaces the left icon / children area
    expect(btn.querySelector('svg')).toBeInTheDocument()
  })

  test('is disabled when disabled prop is set', () => {
    render(<Button disabled>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  test('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    let clicked = false
    render(<Button onClick={() => { clicked = true }}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(clicked).toBe(true)
  })

  test('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    let clicked = false
    render(<Button disabled onClick={() => { clicked = true }}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(clicked).toBe(false)
  })

  test('renders leftIcon when not loading', () => {
    render(<Button leftIcon={<span data-testid="icon">*</span>}>With icon</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  test('hides leftIcon and shows spinner when loading', () => {
    render(<Button loading leftIcon={<span data-testid="icon">*</span>}>Saving</Button>)
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
  })

  test('sm size applies smaller height class', () => {
    render(<Button size="sm">Small</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-8')
  })

  test('lg size applies larger height class', () => {
    render(<Button size="lg">Large</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-10')
  })
})
