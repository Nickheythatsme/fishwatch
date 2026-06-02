import { scoreToLabel, scoreToTone, TONE_HEX } from '@/components/signals/score-utils'
import type { ScoreTone } from '@/components/signals/score-utils'

type Size = 'sm' | 'md' | 'lg'

interface ScoreRingProps {
  score: number | null
  noData?: boolean
  size?: Size
  label?: boolean
  className?: string
}

interface Dims {
  px: number
  stroke: number
  numberClass: string
  labelClass: string
}

const DIMS: Record<Size, Dims> = {
  sm: { px: 48, stroke: 4, numberClass: 'text-base', labelClass: 'text-[9px]' },
  md: { px: 64, stroke: 5, numberClass: 'text-xl', labelClass: 'text-[10px]' },
  lg: { px: 96, stroke: 6, numberClass: 'text-4xl', labelClass: 'text-xs' },
}

const TONE_TEXT: Record<ScoreTone, string> = {
  secondary: 'text-secondary',
  tertiary: 'text-tertiary',
  error: 'text-error',
  neutral: 'text-on-surface-variant',
}

export function ScoreRing({
  score,
  noData = false,
  size = 'md',
  label = true,
  className,
}: ScoreRingProps) {
  const isMissing = noData || score == null
  const tone = scoreToTone(score, isMissing)
  const { px, stroke, numberClass, labelClass } = DIMS[size]
  const r = (px - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = isMissing ? 0 : Math.max(0, Math.min(score / 10, 1))

  return (
    <div className={'flex flex-col items-center ' + (className ?? '')}>
      <div className="relative" style={{ width: px, height: px }}>
        <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} role="presentation">
          <circle
            cx={px / 2}
            cy={px / 2}
            r={r}
            fill="none"
            stroke="#e1e3e2"
            strokeWidth={stroke}
          />
          {!isMissing && (
            <circle
              cx={px / 2}
              cy={px / 2}
              r={r}
              fill="none"
              stroke={TONE_HEX[tone]}
              strokeWidth={stroke}
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
              strokeLinecap="round"
              transform={`rotate(-90 ${px / 2} ${px / 2})`}
            />
          )}
        </svg>
        <div
          className={
            'absolute inset-0 flex items-center justify-center font-headline font-bold ' +
            numberClass +
            ' ' +
            TONE_TEXT[tone]
          }
        >
          {isMissing ? '—' : score!.toFixed(1)}
        </div>
      </div>
      {label && (
        <span
          className={
            'mt-1 font-label font-bold uppercase tracking-wider ' +
            labelClass +
            ' ' +
            TONE_TEXT[tone]
          }
        >
          {isMissing ? 'No Data' : scoreToLabel(score!)}
        </span>
      )}
    </div>
  )
}
