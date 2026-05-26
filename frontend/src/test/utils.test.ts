import { describe, test, expect } from 'vitest'
import {
  cn,
  formatDate,
  colorFromName,
  getInitials,
  scoreColor,
  scoreVerdict,
  STAGE_COLORS,
  STAGE_LABELS,
} from '@/lib/utils'

describe('cn', () => {
  test('combines class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  test('conditionally applies classes', () => {
    expect(cn('a', { b: true, c: false })).toBe('a b')
  })

  test('merges conflicting tailwind classes (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  test('ignores falsy values', () => {
    expect(cn('a', undefined, null, false, 'b')).toBe('a b')
  })
})

describe('formatDate', () => {
  test('formats a valid ISO date string', () => {
    const result = formatDate('2024-01-15T00:00:00Z')
    expect(result).toMatch(/Jan 1[45], 2024/)
  })

  test('returns dash for null', () => {
    expect(formatDate(null)).toBe('-')
  })

  test('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('-')
  })
})

describe('colorFromName', () => {
  test('returns a hex color string', () => {
    const color = colorFromName('John Doe')
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  test('returns consistent color for the same name', () => {
    expect(colorFromName('Alice')).toBe(colorFromName('Alice'))
  })

  test('returns different colors for different names', () => {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']
    const colors = new Set(names.map(colorFromName))
    // Not guaranteed to all differ, but statistically very likely with 8 colors and 5 names
    expect(colors.size).toBeGreaterThan(1)
  })
})

describe('getInitials', () => {
  test('returns initials from two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  test('returns single initial for one-word name', () => {
    expect(getInitials('Alice')).toBe('A')
  })

  test('takes only first two words for longer names', () => {
    expect(getInitials('John Michael Doe')).toBe('JM')
  })

  test('uppercases initials', () => {
    expect(getInitials('john doe')).toBe('JD')
  })

  test('handles extra spaces', () => {
    expect(getInitials('  Alice   Bob  ')).toBe('AB')
  })
})

describe('scoreColor', () => {
  test('returns grey for null score', () => {
    expect(scoreColor(null)).toBe('#94A3B8')
  })

  test('returns green for score >= 80', () => {
    expect(scoreColor(80)).toBe('#22C55E')
    expect(scoreColor(100)).toBe('#22C55E')
  })

  test('returns amber for score 60-79', () => {
    expect(scoreColor(60)).toBe('#F59E0B')
    expect(scoreColor(79)).toBe('#F59E0B')
  })

  test('returns blue for score 40-59', () => {
    expect(scoreColor(40)).toBe('#3B82F6')
    expect(scoreColor(59)).toBe('#3B82F6')
  })

  test('returns red for score < 40', () => {
    expect(scoreColor(0)).toBe('#F43F5E')
    expect(scoreColor(39)).toBe('#F43F5E')
  })
})

describe('scoreVerdict', () => {
  test('returns "Not evaluated" for null', () => {
    expect(scoreVerdict(null)).toBe('Not evaluated')
  })

  test('returns "Strong Fit" for score >= 80', () => {
    expect(scoreVerdict(85)).toBe('Strong Fit')
  })

  test('returns "Good Fit" for score 60-79', () => {
    expect(scoreVerdict(65)).toBe('Good Fit')
  })

  test('returns "Potential Fit" for score 40-59', () => {
    expect(scoreVerdict(50)).toBe('Potential Fit')
  })

  test('returns "Not a Fit" for score < 40', () => {
    expect(scoreVerdict(20)).toBe('Not a Fit')
  })
})

describe('STAGE_COLORS', () => {
  test('defines a color for every stage', () => {
    const stages = ['applied', 'screening', 'interview', 'technical', 'offer', 'hired', 'rejected']
    stages.forEach((stage) => {
      expect(STAGE_COLORS[stage as keyof typeof STAGE_COLORS]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })
})

describe('STAGE_LABELS', () => {
  test('defines a label for every stage', () => {
    const stages = ['applied', 'screening', 'interview', 'technical', 'offer', 'hired', 'rejected']
    stages.forEach((stage) => {
      expect(STAGE_LABELS[stage as keyof typeof STAGE_LABELS]).toBeTruthy()
    })
  })

  test('Applied stage has correct label', () => {
    expect(STAGE_LABELS.applied).toBe('Applied')
  })
})
