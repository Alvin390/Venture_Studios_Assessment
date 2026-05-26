import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StageBadge, StatusBadge, ScoreBadge } from '@/components/ui/Badge'

describe('StageBadge', () => {
  test('renders the stage label', () => {
    render(<StageBadge stage="applied" />)
    expect(screen.getByText('Applied')).toBeInTheDocument()
  })

  test('renders screening label', () => {
    render(<StageBadge stage="screening" />)
    expect(screen.getByText('Screening')).toBeInTheDocument()
  })

  test('renders hired label', () => {
    render(<StageBadge stage="hired" />)
    expect(screen.getByText('Hired')).toBeInTheDocument()
  })

  test('renders rejected label', () => {
    render(<StageBadge stage="rejected" />)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })

  test('accepts className override', () => {
    render(<StageBadge stage="applied" className="my-class" />)
    const badge = screen.getByText('Applied')
    expect(badge.className).toContain('my-class')
  })
})

describe('StatusBadge', () => {
  test('renders open status', () => {
    render(<StatusBadge status="open" />)
    expect(screen.getByText('open')).toBeInTheDocument()
  })

  test('renders closed status', () => {
    render(<StatusBadge status="closed" />)
    expect(screen.getByText('closed')).toBeInTheDocument()
  })

  test('renders draft status', () => {
    render(<StatusBadge status="draft" />)
    expect(screen.getByText('draft')).toBeInTheDocument()
  })
})

describe('ScoreBadge', () => {
  test('renders the score number', () => {
    render(<ScoreBadge score={85} />)
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  test('renders null when score is null', () => {
    const { container } = render(<ScoreBadge score={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  test('renders zero score', () => {
    render(<ScoreBadge score={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
