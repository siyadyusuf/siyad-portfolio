import { Download } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { USE_MOCKS } from '../api/client'
import { PROFILE } from '../data/resume'
import { GithubIcon, InstagramIcon, LinkedinIcon, TiktokIcon } from './icons'

/** The centered column with vertical rules on both sides. */
export function Column({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-3xl border-x border-line ${className}`}>{children}</div>
}

/** Full-bleed diagonal hatch strip used between sections. */
export function HatchBand() {
  return <div className="hatch-band" aria-hidden="true" />
}

export function SectionHeading({ id, children, count, aside }: { id: string; children: ReactNode; count?: number; aside?: ReactNode }) {
  return (
    <div className="screen-line-bottom flex items-end justify-between gap-4 px-4 pt-1">
      <h2 id={id} className="text-3xl font-medium tracking-tight text-fg">
        <a href={`#${id.replace(/-heading$/, '')}`} className="group relative rounded-sm outline-offset-4">
          {children}
          {count !== undefined && <sup className="ml-1 align-super font-mono text-xs font-normal text-subtle">({count})</sup>}
          <span className="absolute top-1/2 -left-4 -translate-y-1/2 text-base text-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
            #
          </span>
        </a>
      </h2>
      {aside && <div className="pb-1.5">{aside}</div>}
    </div>
  )
}

export function Section({ id, title, count, aside, children }: { id: string; title: string; count?: number; aside?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-16">
      <HatchBand />
      <SectionHeading id={`${id}-heading`} count={count} aside={aside}>
        {title}
      </SectionHeading>
      {children}
    </section>
  )
}

/** Pixel monogram "SY" drawn on a 7x5 grid per letter. */
export function Monogram({ className = 'h-5' }: { className?: string }) {
  const S = ['111', '100', '111', '001', '111']
  const Y = ['101', '101', '010', '010', '010']
  const cells: [number, number][] = []
  S.forEach((row, y) => [...row].forEach((c, x) => c === '1' && cells.push([x, y])))
  Y.forEach((row, y) => [...row].forEach((c, x) => c === '1' && cells.push([x + 4, y])))
  return (
    <svg viewBox="0 0 7 5" className={className} fill="currentColor" aria-hidden="true" shapeRendering="crispEdges">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  )
}

const NAV = [
  { href: '/#about', label: 'About' },
  { href: '/#stack', label: 'Stack' },
  { href: '/#projects', label: 'Projects' },
  { href: '/#github', label: 'GitHub' },
  { to: '/blog', label: 'Blog' },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const { pathname } = useLocation()
  return (
    <header className={`sticky top-0 z-50 bg-bg/90 backdrop-blur-md transition-shadow ${scrolled ? 'shadow-[0_1px_0_var(--color-border)]' : ''}`}>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-fg px-3 py-1.5 text-sm font-medium text-bg focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Column className="screen-line-bottom">
        <nav className="flex h-14 items-center gap-2 px-4" aria-label="Main">
          <Link to="/" className="mr-auto flex items-center gap-2 rounded-sm text-fg" aria-label="Siyad Yusuf, home">
            <Monogram className="h-4" />
            <span className="sr-only">Home</span>
          </Link>
          <ul className="no-scrollbar hidden items-center gap-0.5 overflow-x-auto text-sm sm:flex">
            {NAV.map((n) => {
              const active = n.to ? pathname.startsWith(n.to) : false
              const cls = `block rounded-md px-2 py-1 font-medium transition-colors hover:text-fg ${active ? 'text-fg' : 'text-muted'}`
              return (
                <li key={n.label}>
                  {n.to ? (
                    <Link to={n.to} className={cls} aria-current={active ? 'page' : undefined}>
                      {n.label}
                    </Link>
                  ) : (
                    <a href={n.href} className={cls}>
                      {n.label}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
          <a href={PROFILE.github} target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-zinc-900 hover:text-fg" aria-label="GitHub profile (opens in a new tab)">
            <GithubIcon className="size-4" />
          </a>
          <a href={PROFILE.resumePdf} download="Siyad_Yusuf_Resume.pdf" className="btn-ghost h-8 px-2.5 text-xs">
            <Download className="size-3.5" aria-hidden="true" />
            Resume
          </a>
        </nav>
      </Column>
      {/* mobile section nav */}
      <Column className="screen-line-bottom sm:hidden">
        <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto px-3 py-1.5 text-[13px]">
          {NAV.map((n) => (
            <li key={n.label}>
              {n.to ? (
                <Link to={n.to} className="block rounded-md px-2 py-1 font-medium whitespace-nowrap text-muted hover:text-fg">
                  {n.label}
                </Link>
              ) : (
                <a href={n.href} className="block rounded-md px-2 py-1 font-medium whitespace-nowrap text-muted hover:text-fg">
                  {n.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </Column>
    </header>
  )
}

export function SiteFooter() {
  const cell = 'px-4 py-3'
  const label = 'font-mono text-[11px] tracking-wider text-subtle uppercase'
  const val = 'mt-1 font-mono text-sm text-zinc-200'
  return (
    <footer className="mt-0">
      <HatchBand />
      <Column>
        <div className="screen-line-bottom flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p className="font-mono text-sm text-fg">siyadyusuf</p>
          <p className="text-sm text-muted">CS @ George Mason University · open to SWE internships</p>
        </div>
        <dl className="screen-line-bottom grid grid-cols-2 sm:grid-cols-4">
          <div className={`${cell} border-r border-line`}>
            <dt className={label}>Email</dt>
            <dd className={val}>
              <a className="link-underline" href={`mailto:${PROFILE.email}`}>
                {PROFILE.email}
              </a>
            </dd>
          </div>
          <div className={`${cell} sm:border-r sm:border-line`}>
            <dt className={label}>Resume</dt>
            <dd className={val}>
              <a className="link-underline" href={PROFILE.resumePdf} download="Siyad_Yusuf_Resume.pdf">
                PDF
              </a>
            </dd>
          </div>
          <div className={`${cell} border-t border-r border-line sm:border-t-0`}>
            <dt className={label}>Built with</dt>
            <dd className={val}>React + Vite</dd>
          </div>
          <div className={`${cell} border-t border-line sm:border-t-0`}>
            <dt className={label}>Data</dt>
            <dd className={val}>{USE_MOCKS ? 'sample (mock)' : 'live API'}</dd>
          </div>
        </dl>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-subtle">
            <Monogram className="h-3.5" />
            <span className="font-mono text-xs">© {new Date().getFullYear()} Siyad Yusuf</span>
          </span>
          <span className="flex items-center gap-1">
            <a href={PROFILE.github} target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-md text-muted hover:text-fg" aria-label="GitHub (opens in a new tab)">
              <GithubIcon className="size-4" />
            </a>
            <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-md text-muted hover:text-fg" aria-label="LinkedIn (opens in a new tab)">
              <LinkedinIcon className="size-4" />
            </a>
            <a href={PROFILE.instagram} target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-md text-muted hover:text-fg" aria-label="Instagram (opens in a new tab)">
              <InstagramIcon className="size-4" />
            </a>
            <a href={PROFILE.tiktok} target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-md text-muted hover:text-fg" aria-label="TikTok (opens in a new tab)">
              <TiktokIcon className="size-4" />
            </a>
          </span>
        </div>
      </Column>
      <div className="h-16" aria-hidden="true" />
    </footer>
  )
}

/** Scroll to #hash after route changes (React Router doesn't do this for us). */
export function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1))
      let tries = 0
      const tick = () => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ block: 'start' })
        else if (tries++ < 20) window.setTimeout(tick, 50)
      }
      tick()
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])
  return null
}
