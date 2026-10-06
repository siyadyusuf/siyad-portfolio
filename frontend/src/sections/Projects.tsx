import { ChevronDown, Link2, Network, PackageSearch } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Section } from '../components/Layout'
import { VirusCanvas } from '../components/VirusCanvas'
import { PROJECTS, type Project } from '../data/resume'
import { SkillChip } from './Stack'

/** Tiny virus glyph used as YPINR's project icon. */
function VirusGlyph({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return <line key={i} x1={12 + Math.cos(a) * 5} y1={12 + Math.sin(a) * 5} x2={12 + Math.cos(a) * 8.5} y2={12 + Math.sin(a) * 8.5} />
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return <circle key={`k${i}`} cx={12 + Math.cos(a) * 9.6} cy={12 + Math.sin(a) * 9.6} r="1.1" fill="currentColor" stroke="none" />
      })}
    </svg>
  )
}

const ICONS: Record<string, ReactNode> = {
  ypinr: <VirusGlyph />,
  homelab: <Network className="size-3.5" aria-hidden="true" />,
  inventory: <PackageSearch className="size-3.5" aria-hidden="true" />,
}

function ProjectItem({ p, media }: { p: Project; media?: ReactNode }) {
  const [open, setOpen] = useState(true)
  const bodyId = useId()
  return (
    <article id={p.id} className="screen-line-bottom scroll-mt-20" aria-labelledby={`${p.id}-title`}>
      {media && <div className="px-4 pt-4">{media}</div>}
      <div className="flex items-start gap-3 px-4 pt-4">
        <span className={`icon-box mt-0.5 size-7 ${p.id === 'ypinr' ? 'text-rose-400' : ''}`}>{ICONS[p.id]}</span>
        <div className="min-w-0 flex-1">
          <h3 id={`${p.id}-title`} className="font-medium text-fg">
            {p.name}
          </h3>
          {(p.role || p.meta) && (
            <p className="mt-0.5 text-sm text-muted">
              {[p.role, ...(p.meta ?? [])].filter(Boolean).map((m, i) => (
                <span key={m}>
                  {i > 0 && (
                    <span className="text-zinc-600" aria-hidden="true">
                      {' / '}
                    </span>
                  )}
                  <span className="whitespace-nowrap">{m}</span>
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {p.url && (
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-zinc-900 hover:text-fg"
              aria-label={`Visit ${p.name} (opens in a new tab)`}
              title={p.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            >
              <Link2 className="size-4" aria-hidden="true" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={bodyId}
            className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-zinc-900 hover:text-fg"
            aria-label={`${open ? 'Collapse' : 'Expand'} ${p.name} details`}
          >
            <ChevronDown className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div id={bodyId} className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="ml-[2.375rem] border-l border-dashed border-border pr-4 pb-4 pl-4 sm:ml-[2.375rem]">
            <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-zinc-300 [&>li]:ml-4 [&>li]:list-disc [&>li]:pl-1 marker:text-subtle">
              {p.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`${p.name} tech`}>
              {p.tech.map((t) => (
                <SkillChip key={t} label={t} size="sm" />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  )
}

export function Projects() {
  return (
    <Section id="projects" title="Projects" count={PROJECTS.length}>
      {PROJECTS.map((p) => (
        <ProjectItem
          key={p.id}
          p={p}
          media={p.id === 'ypinr' ? <VirusCanvas className="h-56 rounded-lg border border-border bg-[#070708] sm:h-64" /> : undefined}
        />
      ))}
    </Section>
  )
}
