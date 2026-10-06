import { ArrowLeft, ArrowUpRight, ChevronLeft, ExternalLink, Home } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, api, USE_MOCKS } from '../api/client'
import type { Post, PostSummary } from '../api/types'
import { LinkedinIcon } from '../components/icons'
import { Monogram } from '../components/Layout'
import { Markdown } from '../components/Markdown'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatLocalDate, formatLocalDateTime } from '../lib/dates'
import { isHttpUrl, isLinkedinUrl } from '../lib/url'

const PAGE_SIZE = 5

function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.status === 429 ? 'Too many requests right now. Please try again in a minute.' : e.message
  return 'Something went wrong. Please try again.'
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(t)
  }, [])
  return now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')
}

/* ---------------- list screen ---------------- */
function PostList({ hidden }: { hidden: boolean }) {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listPosts(p, PAGE_SIZE)
      setPosts((prev) => (p === 1 ? res.posts : [...prev, ...res.posts.filter((x) => !prev.some((y) => y.id === x.id))]))
      setPage(res.page)
      setTotalPages(res.totalPages)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(1)
  }, [load])

  return (
    <div className="phone-pad mx-auto w-full max-w-2xl pt-6 pb-16" aria-hidden={hidden} inert={hidden}>
      <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-400 uppercase">siyadyusuf / blog</p>
      <h1 className="phone-glow mt-1 text-4xl font-medium tracking-tight text-fg">Blog</h1>
      <p className="mt-1 text-sm text-zinc-400">Notes, write-ups and project updates.</p>
      {USE_MOCKS && (
        <p className="mt-3 inline-flex rounded-md border border-amber-900/60 bg-amber-950/40 px-2 py-1 font-mono text-[11px] text-amber-300">
          sample posts · mock data
        </p>
      )}

      <ol className="mt-6 border-t border-white/[0.07]" aria-label="Blog posts" aria-busy={loading}>
        {posts.map((p, i) => (
          <li key={p.id} className="phone-item border-b border-white/[0.07]" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
            <Link to={`/blog/${p.slug}`} className="group -mx-3 block rounded-lg px-3 py-4 transition-colors hover:bg-white/[0.035] active:bg-white/[0.06]">
              <span className="flex items-center gap-2">
                <time dateTime={p.publishedAt} className="font-mono text-[11px] tracking-wide text-zinc-400">
                  {formatLocalDateTime(p.publishedAt)}
                </time>
                {p.sourceUrl && isLinkedinUrl(p.sourceUrl) && (
                  <span className="text-zinc-400" title="Also on LinkedIn">
                    <LinkedinIcon className="size-3" />
                    <span className="sr-only">(also on LinkedIn)</span>
                  </span>
                )}
              </span>
              <h2 className="phone-glow mt-1 text-[17px] leading-snug font-medium text-balance text-fg underline-offset-4 group-hover:underline group-hover:decoration-zinc-600">
                {p.title}
              </h2>
              {p.excerpt && <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-zinc-400">{p.excerpt}</p>}
            </Link>
          </li>
        ))}
        {loading &&
          Array.from({ length: posts.length ? 1 : 4 }, (_, i) => (
            <li key={`sk-${i}`} className="space-y-2 border-b border-white/[0.07] py-4" aria-hidden="true">
              <div className="h-3 w-40 animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-800/80" />
              <div className="h-3 w-full animate-pulse rounded bg-zinc-900" />
            </li>
          ))}
      </ol>

      {!loading && !error && posts.length === 0 && <p className="mt-10 text-center text-sm text-zinc-400">No posts yet. Check back soon.</p>}
      {error && (
        <div role="alert" className="mt-6 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
          {error}{' '}
          <button type="button" className="font-medium underline underline-offset-4" onClick={() => void load(page + 1 || 1)}>
            Retry
          </button>
        </div>
      )}
      <div className="mt-6 flex flex-col items-center gap-2">
        {!loading && page > 0 && page < totalPages && (
          <button type="button" onClick={() => void load(page + 1)} className="btn">
            Load more
          </button>
        )}
        {page > 0 && (
          <p className="font-mono text-[11px] text-zinc-400">
            page {page} of {totalPages}
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------------- post screen ---------------- */
function SourceLink({ url }: { url: string }) {
  const linkedin = isLinkedinUrl(url)
  const host = new URL(url).hostname.replace(/^www\./, '')
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group mt-10 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
      data-testid="post-source"
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 ${linkedin ? 'bg-[#0a66c2]/15 text-[#5aa2e8]' : 'bg-white/5 text-zinc-300'}`}>
        {linkedin ? <LinkedinIcon className="size-4" /> : <ExternalLink className="size-4" aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-fg">{linkedin ? 'View on LinkedIn' : 'View original'}</span>
        <span className="block truncate font-mono text-[11px] text-zinc-400">
          {linkedin ? 'Originally posted on LinkedIn' : host}
          <span className="sr-only"> (opens in a new tab)</span>
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-zinc-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden="true" />
    </a>
  )
}

function PostView({ slug }: { slug: string }) {
  const [post, setPost] = useState<Post | null>(null)
  const [error, setError] = useState<{ status: number; message: string } | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useDocumentTitle(post ? post.title : error ? 'Post not found' : 'Blog')

  useEffect(() => {
    let alive = true
    api
      .getPost(slug)
      .then((p) => alive && setPost(p))
      .catch((e: unknown) => alive && setError({ status: e instanceof ApiError ? e.status : 0, message: errorText(e) }))
    return () => {
      alive = false
    }
  }, [slug])

  useEffect(() => {
    if (post) headingRef.current?.focus({ preventScroll: true })
    if (!post) return
    const meta = document.querySelector('meta[name="description"]')
    const prev = meta?.getAttribute('content')
    meta?.setAttribute('content', post.content.replace(/[#>*_`[\]()!-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155))
    return () => {
      if (prev) meta?.setAttribute('content', prev)
    }
  }, [post])

  if (error)
    return (
      <div className="phone-pad mx-auto max-w-2xl pt-16 text-center">
        <h1 className="phone-glow text-2xl font-medium tracking-tight">{error.status === 404 ? 'Post not found' : 'Couldn’t load this post'}</h1>
        <p className="mt-2 text-sm text-zinc-400">{error.status === 404 ? 'It may be unpublished or scheduled for later.' : error.message}</p>
        <Link to="/blog" className="btn mt-6">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> All posts
        </Link>
      </div>
    )
  if (!post)
    return (
      <div className="phone-pad mx-auto max-w-2xl space-y-3 pt-8" aria-busy="true">
        <div className="h-3 w-44 animate-pulse rounded bg-zinc-800" />
        <div className="h-8 w-5/6 animate-pulse rounded bg-zinc-800" />
        <div className="h-48 animate-pulse rounded bg-zinc-900/70" />
      </div>
    )
  const edited = Date.parse(post.updatedAt) - Date.parse(post.publishedAt) > 60_000
  return (
    <article className="phone-pad mx-auto max-w-2xl pt-6 pb-20">
      <p className="font-mono text-[11px] tracking-wide text-zinc-400">
        <time dateTime={post.publishedAt}>{formatLocalDateTime(post.publishedAt)}</time>
        {edited && (
          <>
            {' · updated '}
            <time dateTime={post.updatedAt}>{formatLocalDate(post.updatedAt)}</time>
          </>
        )}
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="phone-glow mt-2 text-3xl leading-tight font-medium tracking-tight text-balance outline-none">
        {post.title}
      </h1>
      <div className="my-6 h-px bg-gradient-to-r from-white/15 via-white/5 to-transparent" aria-hidden="true" />
      <Markdown>{post.content}</Markdown>
      {post.sourceUrl && isHttpUrl(post.sourceUrl) && <SourceLink url={post.sourceUrl} />}
      <div className="mt-10 flex justify-center">
        <Link to="/blog" className="btn">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> All posts
        </Link>
      </div>
    </article>
  )
}

/* ---------------- the phone ---------------- */
export default function Blog() {
  useDocumentTitle('Blog')
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const clock = useClock()
  const postScroll = useRef<HTMLDivElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  /* After the entrance + CRT power-on/glitch finish, drop will-change and one-shot layers. */
  const [settled, setSettled] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  // full-screen experience: no page scroll behind the phone
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    if (settled) return
    const el = phoneRef.current
    if (!el) return
    const finish = () => setSettled(true)
    // Entrance is 1.35s; CRT power-on + glitch run until ~1.82s. Settle after the last one-shot.
    const onEnd = (e: AnimationEvent) => {
      if (e.animationName === 'crt-glitch') finish()
    }
    el.addEventListener('animationend', onEnd)
    const t = window.setTimeout(finish, 2100)
    return () => {
      el.removeEventListener('animationend', onEnd)
      window.clearTimeout(t)
    }
  }, [settled])

  useEffect(() => {
    postScroll.current?.scrollTo({ top: 0 })
  }, [slug])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && slug) navigate('/blog')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slug, navigate])

  return (
    <div className="blog-stage fixed inset-0 overflow-hidden bg-bg">
      <a href="#phone-screen" className="sr-only z-[80] rounded-md bg-fg px-3 py-1.5 text-sm font-medium text-bg focus:not-sr-only focus:absolute focus:top-3 focus:left-3">
        Skip to posts
      </a>
      <div className="dot-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(74,222,128,0.07),transparent_60%)]" aria-hidden="true" />

      <div ref={phoneRef} className={`phone${settled ? ' phone--settled' : ''}`} data-testid="phone">
        <span className="phone-btn phone-btn-a" aria-hidden="true" />
        <span className="phone-btn phone-btn-b" aria-hidden="true" />
        <span className="phone-btn phone-btn-c" aria-hidden="true" />
        <div className="phone-screen">
          <div className="phone-content flex h-full flex-col">
            {/* status bar */}
            <div className="phone-status relative flex h-9 shrink-0 items-center justify-between font-mono text-[12px] font-medium text-zinc-300" aria-hidden="true">
              <span className="tabular-nums">{clock}</span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 18 12" className="h-2.5 w-3.5" fill="currentColor">
                  <rect x="0" y="8" width="3" height="4" rx="1" />
                  <rect x="5" y="5" width="3" height="7" rx="1" />
                  <rect x="10" y="2" width="3" height="10" rx="1" />
                  <rect x="15" y="0" width="3" height="12" rx="1" opacity=".35" />
                </svg>
                <svg viewBox="0 0 26 12" className="h-2.5 w-5">
                  <rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".5" />
                  <rect x="2" y="2" width="15" height="8" rx="2" fill="#4ade80" />
                  <rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".5" />
                </svg>
              </span>
            </div>

            {/* app bar */}
            <nav className="phone-pad-x flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.07]" aria-label="Blog">
              {slug ? (
                <Link to="/blog" className="-ml-2 flex items-center gap-0.5 rounded-md px-2 py-1 text-[15px] font-medium text-zinc-200 transition-colors hover:bg-white/5 hover:text-fg">
                  <ChevronLeft className="size-5" aria-hidden="true" /> Posts
                </Link>
              ) : (
                <Link to="/" className="-ml-2 flex items-center gap-0.5 rounded-md px-2 py-1 text-[15px] font-medium text-zinc-200 transition-colors hover:bg-white/5 hover:text-fg">
                  <ChevronLeft className="size-5" aria-hidden="true" /> Site
                </Link>
              )}
              <span className="mx-auto flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Monogram className="h-3" />
                Blog
              </span>
              <Link to="/" className="-mr-1.5 grid size-9 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-white/5 hover:text-fg" aria-label="Back to the main site">
                <Home className="size-4" aria-hidden="true" />
              </Link>
            </nav>

            {/* screens */}
            <main id="phone-screen" className="relative min-h-0 flex-1">
              <div className="phone-scroll absolute inset-0 overflow-y-auto overscroll-contain" style={{ visibility: slug ? 'hidden' : 'visible' }} data-testid="phone-list">
                <PostList hidden={Boolean(slug)} />
              </div>
              {slug && (
                <div key={slug} ref={postScroll} className="phone-push phone-scroll absolute inset-0 overflow-y-auto overscroll-contain bg-[#0b0b0d]" data-testid="phone-post">
                  <PostView slug={slug} />
                </div>
              )}
            </main>

            {/* home indicator doubles as "back to site" */}
            <Link to="/" className="group flex h-6 shrink-0 items-center justify-center" aria-label="Back to the main site">
              <span className="h-[5px] w-32 rounded-full bg-zinc-600 transition-colors group-hover:bg-zinc-300" />
            </Link>
          </div>

          {/* dynamic island */}
          <span className="phone-island" aria-hidden="true" />
          {/* display filter: scanlines, bloom/vignette, fringe, glare (all pointer-events:none) */}
          <span className="crt-tint" aria-hidden="true" />
          <span className="crt-scanlines" aria-hidden="true" />
          <span className="crt-vignette" aria-hidden="true" />
          <span className="crt-glare" aria-hidden="true" />
          {/* entrance-only: unmount after settle so idle has fewer layers */}
          {!settled && (
            <>
              <span className="crt-off" aria-hidden="true" />
              <span className="crt-line" aria-hidden="true" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
