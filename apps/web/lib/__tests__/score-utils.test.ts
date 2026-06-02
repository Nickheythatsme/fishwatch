import { describe, it, expect } from 'vitest'
import {
  isNoDataSignal,
  scoreToColor,
  scoreToContainerColor,
  scoreToLabel,
  scoreToTextColor,
  scoreToTone,
} from '@/components/signals/score-utils'

describe('scoreToTone — bucket boundaries', () => {
  it.each([
    [10, 'secondary'],
    [8.0, 'secondary'],
    [7.99, 'tertiary'],
    [5.0, 'tertiary'],
    [4.99, 'error'],
    [0, 'error'],
  ] as const)('score %f -> %s', (score, expected) => {
    expect(scoreToTone(score)).toBe(expected)
  })

  it('returns neutral when noData is true', () => {
    expect(scoreToTone(9, true)).toBe('neutral')
  })

  it('returns neutral when score is null or undefined', () => {
    expect(scoreToTone(null)).toBe('neutral')
    expect(scoreToTone(undefined)).toBe('neutral')
  })
})

describe('scoreToColor / scoreToContainerColor', () => {
  it('saturated bg for chips', () => {
    expect(scoreToColor(9)).toBe('bg-secondary')
    expect(scoreToColor(6)).toBe('bg-tertiary')
    expect(scoreToColor(2)).toBe('bg-error')
    expect(scoreToColor(null)).toBe('bg-surface-container-high')
  })

  it('soft container bg for tonal cards', () => {
    expect(scoreToContainerColor(9)).toBe('bg-secondary-container')
    expect(scoreToContainerColor(6)).toBe('bg-tertiary-fixed')
    expect(scoreToContainerColor(2)).toBe('bg-error-container')
    expect(scoreToContainerColor(null)).toBe('bg-surface-container-high')
  })
})

describe('scoreToTextColor', () => {
  it('maps to tone text colors', () => {
    expect(scoreToTextColor(8.5)).toBe('text-secondary')
    expect(scoreToTextColor(5)).toBe('text-tertiary')
    expect(scoreToTextColor(2.5)).toBe('text-error')
    expect(scoreToTextColor(null)).toBe('text-on-surface-variant')
  })
})

describe('scoreToLabel', () => {
  it('uses 5-band scale independent of color buckets', () => {
    expect(scoreToLabel(9.5)).toBe('Excellent')
    expect(scoreToLabel(9)).toBe('Excellent')
    expect(scoreToLabel(8.5)).toBe('Great')
    expect(scoreToLabel(8)).toBe('Great')
    expect(scoreToLabel(6)).toBe('Fair')
    expect(scoreToLabel(5)).toBe('Fair')
    expect(scoreToLabel(4)).toBe('Poor')
    expect(scoreToLabel(3)).toBe('Poor')
    expect(scoreToLabel(2)).toBe('Avoid')
    expect(scoreToLabel(0)).toBe('Avoid')
  })
})

describe('isNoDataSignal', () => {
  it('detects the synthetic no-data marker', () => {
    expect(
      isNoDataSignal({
        compositeScore: 5.0,
        flowScore: null,
        sentimentScore: null,
        consensusScore: null,
      })
    ).toBe(true)
  })

  it('returns false when any subscore is present', () => {
    expect(
      isNoDataSignal({
        compositeScore: 5.0,
        flowScore: 7,
        sentimentScore: null,
        consensusScore: null,
      })
    ).toBe(false)
  })

  it('returns false for a real 5.0 composite with subscores', () => {
    expect(
      isNoDataSignal({
        compositeScore: 5.0,
        flowScore: 5,
        sentimentScore: 5,
        consensusScore: 5,
      })
    ).toBe(false)
  })

  it('returns false for null / undefined input', () => {
    expect(isNoDataSignal(null)).toBe(false)
    expect(isNoDataSignal(undefined)).toBe(false)
  })
})
