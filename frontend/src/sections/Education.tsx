import { BookOpen, GraduationCap, Trophy } from 'lucide-react'
import { Section } from '../components/Layout'
import { COURSEWORK, EDUCATION, RECOGNITION } from '../data/resume'

export function Education() {
  return (
    <Section id="education" title="Education">
      <ul>
        {EDUCATION.map((e) => (
          <li key={e.school} className="screen-line-bottom flex gap-3 px-4 py-4">
            <span className="icon-box mt-0.5 size-7">
              <GraduationCap className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <h3 className="font-medium text-fg">{e.school}</h3>
                <span className="font-mono text-xs text-muted">{e.date}</span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                <span className="text-zinc-300">{e.degree}</span>
                <span className="h-3 w-px bg-border" aria-hidden="true" />
                <span>{e.location}</span>
              </p>
            </div>
          </li>
        ))}
        <li className="screen-line-bottom flex gap-3 px-4 py-4">
          <span className="icon-box mt-0.5 size-7">
            <BookOpen className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-fg">Relevant coursework</h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {COURSEWORK.map((c) => (
                <li key={c} className="chip">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </li>
      </ul>
    </Section>
  )
}

export function Recognition() {
  return (
    <Section id="recognition" title="Recognition" count={RECOGNITION.length}>
      <ul>
        {RECOGNITION.map((r) => (
          <li key={r.title} className="screen-line-bottom group flex gap-3 px-4 py-4">
            <span className="icon-box mt-0.5 size-7 transition-colors group-hover:border-amber-400/40 group-hover:text-amber-300">
              <Trophy className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-fg">{r.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                <span className="chip mr-2 text-[11px]">{r.tag}</span>
                {r.detail.map((d) => (
                  <span key={d}>
                    <span className="whitespace-nowrap">{d}</span>
                    <span className="text-zinc-600" aria-hidden="true">
                      {' / '}
                    </span>
                  </span>
                ))}
                <a href="#ypinr" className="link-underline whitespace-nowrap">
                  {r.project}
                </a>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
