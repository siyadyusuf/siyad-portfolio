import { BriefcaseBusiness, Code, Download, Globe, GraduationCap, Lightbulb, Mail } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Monogram } from '../components/Layout'
import { GithubIcon, InstagramIcon, LinkedinIcon, TiktokIcon } from '../components/icons'
import { PROFILE } from '../data/resume'

const TERMINAL = [
  { cmd: 'whoami', out: 'siyad yusuf · computer science @ george mason university' },
  { cmd: 'cat ./now.txt', out: 'seeking software engineering internships' },
]

function useReducedMotion() {
  const [r, setR] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setR(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return r
}

/** Typewriter terminal in the banner (static under reduced motion). */
function Terminal() {
  const reduce = useReducedMotion()
  const full = TERMINAL.flatMap((l) => [`$ ${l.cmd}`, l.out])
  const totalChars = full.reduce((s, l) => s + l.length, 0)
  const [n, setN] = useState(reduce ? totalChars : 0)
  useEffect(() => {
    if (reduce) return setN(totalChars)
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setN(i)
      if (i >= totalChars) window.clearInterval(id)
    }, 28)
    return () => window.clearInterval(id)
  }, [reduce, totalChars])
  let left = n
  return (
    <pre className="font-mono text-[12px] leading-6 whitespace-pre-wrap text-zinc-500 sm:text-[13px]" aria-hidden="true">
      {full.map((line, i) => {
        const shown = line.slice(0, Math.max(0, left))
        left -= line.length
        const isCmd = i % 2 === 0
        return (
          <div key={i} className={isCmd ? 'text-zinc-400' : 'text-zinc-500'}>
            {isCmd ? <span className="text-accent/80">{shown.slice(0, 1)}</span> : null}
            {isCmd ? shown.slice(1) : shown}
            {shown.length > 0 && shown.length < line.length && <span className="animate-blink text-zinc-300">▍</span>}
            {'\u00a0'}
          </div>
        )
      })}
      <div className="text-zinc-400">
        <span className="text-accent/80">$</span> {n >= totalChars && <span className="animate-blink text-zinc-300">▍</span>}
      </div>
    </pre>
  )
}

/** Decorative pixel field on the right of the banner: a slow, twinkling contribution-style grid. */
function PixelField() {
  const cols = 14
  const rows = 7
  const cells: { x: number; y: number; o: number; d: number }[] = []
  let seed = 42
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++) {
      // denser towards the right edge, like activity picking up
      const p = (x / cols) * 0.75 + r() * 0.5
      cells.push({ x, y, o: p > 0.85 ? 0.9 : p > 0.7 ? 0.55 : p > 0.5 ? 0.25 : 0.08, d: r() * 6 })
    }
  return (
    <svg viewBox={`0 0 ${cols * 14} ${rows * 14}`} className="h-[7.5rem] sm:h-32" aria-hidden="true">
      {cells.map((c) => (
        <rect
          key={`${c.x}-${c.y}`}
          x={c.x * 14}
          y={c.y * 14}
          width="10"
          height="10"
          rx="2"
          className="pixel-twinkle fill-zinc-300"
          style={{ opacity: c.o, animationDelay: `${c.d.toFixed(2)}s`, ['--o' as string]: c.o }}
        />
      ))}
    </svg>
  )
}

const ROLES = ['Computer Science @ GMU', 'Co-Founder @ YPINR', 'Seeking SWE internships']

/** Subtitle that flips through a few true one-liners. */
function FlipText() {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => setI((x) => (x + 1) % ROLES.length), 2800)
    return () => window.clearInterval(id)
  }, [reduce])
  return (
    <p className="h-6 overflow-hidden font-mono text-sm text-muted">
      <span className="sr-only">{ROLES.join(', ')}</span>
      <span key={i} className="animate-fade-up block" aria-hidden="true">
        {ROLES[i]}
      </span>
    </p>
  )
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 font-mono text-sm text-zinc-200">
      <span className="icon-box size-7">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </li>
  )
}

export function Intro() {
  const ic = 'size-3.5'
  return (
    <section aria-labelledby="intro-name">
      {/* banner */}
      <div className="screen-line-bottom relative h-44 overflow-hidden sm:h-52">
        <div className="dot-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
        <div className="absolute inset-0 flex items-center px-4 sm:px-8">
          <Terminal />
        </div>
        <div className="absolute top-1/2 right-6 hidden -translate-y-1/2 [mask-image:linear-gradient(to_right,transparent,black_60%)] md:block">
          <PixelField />
        </div>
        <span className="absolute right-3 bottom-2 font-mono text-[11px] text-subtle" aria-hidden="true">
          ~/siyad
        </span>
      </div>

      {/* identity */}
      <div className="screen-line-bottom flex">
        <div className="shrink-0 border-r border-line p-3">
          <div className="relative grid size-24 place-items-center rounded-full border border-border bg-[radial-gradient(circle_at_30%_25%,#27272a,#0b0b0d_70%)] text-zinc-100 sm:size-28">
            <Monogram className="h-7 sm:h-8" />
            <span className="absolute right-1.5 bottom-1.5 flex size-4 items-center justify-center rounded-full bg-bg" title="Open to internships">
              <span className="size-2.5 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]" />
            </span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-end">
          <div className="screen-line-bottom px-4 pb-1">
            <h1 id="intro-name" className="text-3xl font-medium tracking-tight sm:text-4xl">
              {PROFILE.name}
            </h1>
          </div>
          <div className="px-4 py-1.5">
            <FlipText />
          </div>
        </div>
      </div>

      {/* links */}
      <div className="screen-line-bottom flex flex-wrap items-center gap-2 px-4 py-3">
        <a href={PROFILE.github} target="_blank" rel="noopener noreferrer" className="btn-ghost size-9 p-0" aria-label="GitHub (opens in a new tab)" title="GitHub">
          <GithubIcon className="size-4" />
        </a>
        <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer" className="btn-ghost size-9 p-0" aria-label="LinkedIn (opens in a new tab)" title="LinkedIn">
          <LinkedinIcon className="size-4" />
        </a>
        <a href={`mailto:${PROFILE.email}`} className="btn-ghost size-9 p-0" aria-label={`Email ${PROFILE.email}`} title="Email">
          <Mail className="size-4" aria-hidden="true" />
        </a>
        <a href={PROFILE.instagram} target="_blank" rel="noopener noreferrer" className="btn-ghost group size-9 p-0" aria-label="Instagram (opens in a new tab)" title="Instagram">
          <InstagramIcon className="size-4 transition-colors group-hover:text-[#FF0069]" />
        </a>
        <a href={PROFILE.tiktok} target="_blank" rel="noopener noreferrer" className="btn-ghost size-9 p-0" aria-label="TikTok (opens in a new tab)" title="TikTok">
          <TiktokIcon className="size-4" />
        </a>
        <a href={PROFILE.resumePdf} download="Siyad_Yusuf_Resume.pdf" className="btn-primary h-9 w-full px-3.5 sm:ml-auto sm:w-auto">
          <Download className="size-4" aria-hidden="true" />
          Download Resume
        </a>
      </div>

      {/* overview */}
      <div className="grid sm:grid-cols-2">
        <ul className="space-y-2.5 p-4 sm:border-r sm:border-line">
          <Row icon={<Code className={ic} aria-hidden="true" />}>CS @ George Mason University</Row>
          <Row icon={<Lightbulb className={ic} aria-hidden="true" />}>Co-Founder &amp; Developer @ YPINR</Row>
          <Row icon={<GraduationCap className={ic} aria-hidden="true" />}>B.S. expected May 2027</Row>
        </ul>
        <ul className="space-y-2.5 border-t border-line p-4 sm:border-t-0">
          <Row icon={<Mail className={ic} aria-hidden="true" />}>
            <a className="link-underline" href={`mailto:${PROFILE.email}`}>
              {PROFILE.email}
            </a>
          </Row>
          <Row icon={<Globe className={ic} aria-hidden="true" />}>
            <a className="link-underline" href={PROFILE.website} target="_blank" rel="noopener noreferrer">
              yourprinceisnotreal.net
            </a>
          </Row>
          <Row icon={<BriefcaseBusiness className={ic} aria-hidden="true" />}>
            <span className="flex items-center gap-2">
              Open to SWE internships
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
            </span>
          </Row>
        </ul>
      </div>
    </section>
  )
}
