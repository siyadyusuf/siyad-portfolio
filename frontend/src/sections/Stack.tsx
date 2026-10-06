import type { CSSProperties } from 'react'
import { Section } from '../components/Layout'
import { SkillGlyph, hoverColor, iconFor } from '../components/icons'
import { SKILL_GROUPS } from '../data/resume'

export function SkillChip({ label, size = 'md' }: { label: string; size?: 'sm' | 'md' }) {
  const style = { '--brand': hoverColor(iconFor(label)) } as CSSProperties
  return (
    <li
      style={style}
      className={`group/chip inline-flex cursor-default items-center gap-1.5 rounded-md border border-border bg-chip font-mono text-zinc-300 transition-[border-color,background-color,color,transform] duration-200 hover:-translate-y-px hover:border-zinc-600 hover:bg-zinc-800/70 hover:text-fg ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'
      }`}
    >
      <span className="text-zinc-400 transition-colors duration-200 group-hover/chip:text-[var(--brand)]">
        <SkillGlyph label={label} className={size === 'sm' ? 'size-3' : 'size-3.5'} />
      </span>
      {label}
    </li>
  )
}

export function Stack() {
  const count = SKILL_GROUPS.reduce((s, g) => s + g.items.length, 0)
  return (
    <Section id="stack" title="Stack" count={count}>
      <div>
        {SKILL_GROUPS.map((g, i) => (
          <div key={g.group} className="screen-line-bottom grid sm:grid-cols-[12.5rem_1fr]">
            <h3 className="flex items-baseline gap-2 px-4 pt-3 text-sm font-medium text-fg sm:border-r sm:border-dashed sm:border-line sm:py-3.5">
              <span className="font-mono text-xs text-subtle tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              {g.group}
            </h3>
            <ul className="flex flex-wrap gap-1.5 px-4 pt-2 pb-3.5 sm:py-3" aria-label={`${g.group} skills`}>
              {g.items.map((s) => (
                <SkillChip key={s} label={s} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}
