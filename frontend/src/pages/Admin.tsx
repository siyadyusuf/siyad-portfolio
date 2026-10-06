import { AlertTriangle, ExternalLink, LogOut, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, api, USE_MOCKS } from '../api/client'
import type { AdminPost, AdminPostInput, PostStatus } from '../api/types'
import { Markdown } from '../components/Markdown'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { MOCK_ADMIN_PASSWORD } from '../lib/config'
import { formatLocalDateTime, isoToLocalInput, localInputToIso, relativeTime } from '../lib/dates'
import { slugify } from '../lib/slug'
import { isHttpUrl, isLinkedinUrl } from '../lib/url'
import { LinkedinIcon } from '../components/icons'

type Badge = 'Draft' | 'Scheduled' | 'Published'

function badgeOf(p: { status: PostStatus; publishedAt: string }, now = Date.now()): Badge {
  if (p.status === 'draft') return 'Draft'
  return Date.parse(p.publishedAt) > now ? 'Scheduled' : 'Published'
}

const BADGE_CLS: Record<Badge, string> = {
  Draft: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  Scheduled: 'border-amber-800/70 bg-amber-950/50 text-amber-300',
  Published: 'border-emerald-800/70 bg-emerald-950/50 text-emerald-300',
}
const BADGE_DOT: Record<Badge, string> = { Draft: 'bg-zinc-500', Scheduled: 'bg-amber-400', Published: 'bg-emerald-400' }

function StatusBadge({ badge }: { badge: Badge }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase ${BADGE_CLS[badge]}`}>
      <span className={`size-1.5 rounded-full ${BADGE_DOT[badge]}`} aria-hidden="true" />
      {badge}
    </span>
  )
}

function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return 'Too many attempts. Please wait a bit and try again.'
    return e.code && e.code !== 'HTTP_ERROR' ? `${e.message} (${e.code})` : e.message
  }
  return 'Something went wrong.'
}

function ErrorBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="rounded text-red-300 hover:text-red-100" aria-label="Dismiss error">
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

const panel = 'rounded-lg border border-border bg-card'
const labelCls = 'mb-1 block font-mono text-[11px] tracking-wider text-subtle uppercase'

/* ---------------- Login ---------------- */
function Login({ onDone, notice }: { onDone: () => void; notice?: string }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.login(password)
      onDone()
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <form onSubmit={submit} className={`${panel} p-6`}>
        <h1 className="text-2xl font-medium tracking-tight">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted">Blog editor for siyadyusuf’s portfolio.</p>
        {notice && <p className="mt-4 rounded-md border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">{notice}</p>}
        <label htmlFor="admin-password" className={`${labelCls} mt-5`}>
          Password
        </label>
        <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
        {error && (
          <div className="mt-3">
            <ErrorBanner message={error} />
          </div>
        )}
        <button type="submit" disabled={busy || !password} className="btn-primary mt-5 w-full py-2">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {USE_MOCKS && (
          <p className="mt-4 text-center text-xs text-subtle">
            Mock mode: password is <code className="rounded border border-border bg-chip px-1 font-mono text-zinc-300">{MOCK_ADMIN_PASSWORD}</code>
          </p>
        )}
      </form>
    </div>
  )
}

/* ---------------- Editor ---------------- */
interface Draft {
  title: string
  slug: string
  content: string
  publishLocal: string
  status: PostStatus
  sourceUrl: string
}

const emptyDraft = (): Draft => ({ title: '', slug: '', content: '', publishLocal: isoToLocalInput(new Date().toISOString()), status: 'draft', sourceUrl: '' })
const toDraft = (p: AdminPost): Draft => ({ title: p.title, slug: p.slug, content: p.content, publishLocal: isoToLocalInput(p.publishedAt), status: p.status, sourceUrl: p.sourceUrl ?? '' })

function Editor({
  editing,
  onSaved,
  onCancel,
  onUnauthorized,
  savedMsg,
  setSavedMsg,
}: {
  editing: AdminPost | null
  onSaved: (p: AdminPost) => void
  onCancel: () => void
  onUnauthorized: () => void
  savedMsg: string | null
  setSavedMsg: (m: string | null) => void
}) {
  const [d, setD] = useState<Draft>(() => (editing ? toDraft(editing) : emptyDraft()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  // Reset the form only when switching to a different post (not on every list refresh).
  const editingId = editing?.id ?? null
  useEffect(() => {
    setD(editing ? toDraft(editing) : emptyDraft())
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }))
  const publishIso = d.publishLocal ? localInputToIso(d.publishLocal) : ''
  const willBe: Badge | null = publishIso ? badgeOf({ status: d.status, publishedAt: publishIso }) : null
  const slugValid = d.slug === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug)
  const sourceUrlValid = d.sourceUrl.trim() === '' || isHttpUrl(d.sourceUrl)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!d.publishLocal) return setError('Pick a publish date and time.')
    if (!slugValid) return setError('Slug: use lowercase letters, numbers and dashes.')
    const input: AdminPostInput = { title: d.title.trim(), content: d.content, publishedAt: publishIso, status: d.status }
    if (!sourceUrlValid) return setError('Original post URL must start with http:// or https://.')
    if (d.slug.trim()) input.slug = d.slug.trim()
    const sourceUrl = d.sourceUrl.trim()
    if (sourceUrl) input.sourceUrl = sourceUrl
    else if (editing?.sourceUrl) input.sourceUrl = null // explicitly clear it
    setBusy(true)
    setError(null)
    setSavedMsg(null)
    try {
      const saved = editing ? await api.adminUpdatePost(editing.id, input) : await api.adminCreatePost(input)
      setD(toDraft(saved))
      onSaved(saved)
      setSavedMsg(editing ? 'Changes saved.' : `Post created at /blog/${saved.slug}.`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized()
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${panel} flex flex-col gap-4 p-4 sm:p-5`} aria-labelledby="editor-heading">
      <div className="flex items-center gap-3">
        <h2 id="editor-heading" className="text-lg font-medium tracking-tight">
          {editing ? 'Edit post' : 'New post'}
        </h2>
        {editing && <span className="truncate font-mono text-[11px] text-subtle">#{editing.id} · updated {formatLocalDateTime(editing.updatedAt)}</span>}
        <button type="button" onClick={onCancel} className="ml-auto rounded text-sm text-muted hover:text-fg">
          {editing ? 'Cancel' : 'Clear'}
        </button>
      </div>

      <div>
        <label htmlFor="post-title" className={labelCls}>
          Title
        </label>
        <input id="post-title" required maxLength={200} value={d.title} onChange={(e) => set('title', e.target.value)} className="field" placeholder="My new post" />
      </div>

      <div>
        <label htmlFor="post-slug" className={labelCls}>
          Slug <span className="normal-case">(optional)</span>
        </label>
        <div className="flex items-center rounded-md border border-border bg-card transition-colors focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-500/25 hover:border-zinc-700">
          <span className="pl-3 font-mono text-sm text-subtle">/blog/</span>
          <input
            id="post-slug"
            value={d.slug}
            maxLength={80}
            onChange={(e) => set('slug', e.target.value.toLowerCase())}
            placeholder={editing ? editing.slug : slugify(d.title || 'my-new-post')}
            className="w-full rounded-md bg-transparent px-1 py-2 font-mono text-sm text-fg outline-none placeholder:text-zinc-600"
            aria-invalid={!slugValid}
            aria-describedby="slug-help"
          />
        </div>
        <p id="slug-help" className={`mt-1 text-xs ${slugValid ? 'text-subtle' : 'text-red-300'}`}>
          {slugValid ? (editing ? 'Leave as is to keep the current URL.' : 'Leave blank to generate one from the title.') : 'Use lowercase letters, numbers and dashes.'}
        </p>
      </div>

      <div>
        <label htmlFor="post-source" className={labelCls}>
          Original post URL <span className="normal-case">(optional)</span>
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-subtle">
            {d.sourceUrl && sourceUrlValid && !isLinkedinUrl(d.sourceUrl) ? <ExternalLink className="size-3.5" aria-hidden="true" /> : <LinkedinIcon className="size-3.5" />}
          </span>
          <input
            id="post-source"
            type="url"
            inputMode="url"
            maxLength={2048}
            value={d.sourceUrl}
            onChange={(e) => set('sourceUrl', e.target.value)}
            placeholder="https://www.linkedin.com/posts/…"
            className="field pl-9 font-mono text-sm"
            aria-invalid={!sourceUrlValid}
            aria-describedby="source-help"
          />
        </div>
        <p id="source-help" className={`mt-1 text-xs ${sourceUrlValid ? 'text-subtle' : 'text-red-300'}`}>
          {!sourceUrlValid
            ? 'Enter a full http(s) URL, e.g. https://www.linkedin.com/posts/…'
            : d.sourceUrl.trim()
              ? `Readers will see “${isLinkedinUrl(d.sourceUrl) ? 'View on LinkedIn' : 'View original'}” at the end of the post.`
              : 'If this was cross-posted (e.g. on LinkedIn), link the original. Leave blank for none.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="post-date" className={labelCls}>
            Publish date &amp; time <span className="normal-case">({tz})</span>
          </label>
          <input id="post-date" type="datetime-local" required value={d.publishLocal} onChange={(e) => set('publishLocal', e.target.value)} className="field [color-scheme:dark]" />
          {publishIso && (
            <p className="mt-1 text-xs text-subtle">
              Sent as UTC: <code className="font-mono text-zinc-400">{publishIso}</code>
            </p>
          )}
        </div>
        <fieldset>
          <legend className={labelCls}>Status</legend>
          <div className="flex gap-2">
            {(['draft', 'published'] as const).map((s) => (
              <label
                key={s}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm capitalize transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                  d.status === s ? 'border-zinc-500 bg-zinc-800 text-fg' : 'border-border bg-card text-muted hover:border-zinc-700'
                }`}
              >
                <input type="radio" name="status" value={s} checked={d.status === s} onChange={() => set('status', s)} className="accent-zinc-200" />
                {s}
              </label>
            ))}
          </div>
          {willBe && (
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              Will appear as <StatusBadge badge={willBe} />
              {willBe === 'Scheduled' && <span>· goes live {formatLocalDateTime(publishIso)}</span>}
            </p>
          )}
        </fieldset>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="post-content" className="block font-mono text-[11px] tracking-wider text-subtle uppercase">
            Content <span className="normal-case">(Markdown)</span>
          </label>
          <div className="flex rounded-md border border-border p-0.5 text-xs lg:hidden" role="tablist" aria-label="Editor view">
            {(['write', 'preview'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded px-2.5 py-1 capitalize ${tab === t ? 'bg-zinc-800 text-fg' : 'text-muted'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <textarea
            id="post-content"
            required
            value={d.content}
            onChange={(e) => set('content', e.target.value)}
            rows={18}
            placeholder={'## Heading\n\nWrite your post in **Markdown**…'}
            className={`field min-h-[360px] resize-y font-mono text-[13px] leading-relaxed ${tab === 'preview' ? 'max-lg:hidden' : ''}`}
          />
          <section className={`min-h-[360px] overflow-auto rounded-md border border-dashed border-border bg-bg p-4 ${tab === 'write' ? 'max-lg:hidden' : ''}`} aria-label="Live preview">
            <p className="mb-3 font-mono text-[10px] tracking-wider text-subtle uppercase">Live preview</p>
            {d.title && <h1 className="mb-3 text-2xl font-medium tracking-tight">{d.title}</h1>}
            {d.content ? <Markdown>{d.content}</Markdown> : <p className="text-sm text-subtle italic">Nothing to preview yet.</p>}
          </section>
        </div>
      </div>

      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
      {savedMsg && !error && <p role="status" className="rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{savedMsg}</p>}

      <div className="flex justify-end gap-2">
        <button type="submit" disabled={busy || !slugValid || !sourceUrlValid} className="btn-primary px-4 py-2">
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create post'}
        </button>
      </div>
    </form>
  )
}

/* ---------------- Delete confirmation ---------------- */
function ConfirmDelete({ post, onCancel, onConfirm, busy }: { post: AdminPost; onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', k)
    return () => {
      window.removeEventListener('keydown', k)
      prev?.focus()
    }
  }, [onCancel])
  return (
    <div className="animate-pop-in fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc" className={`${panel} w-full max-w-sm p-5 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <h2 id="del-title" className="text-lg font-medium tracking-tight">
          Delete this post?
        </h2>
        <p id="del-desc" className="mt-2 text-sm text-muted">
          “{post.title}” will be permanently deleted. This can’t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50">
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Page ---------------- */
export default function Admin() {
  useDocumentTitle('Admin')
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [notice, setNotice] = useState<string | undefined>()
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [toDelete, setToDelete] = useState<AdminPost | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filter, setFilter] = useState<'All' | Badge>('All')
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const selectPost = (id: number | null) => {
    setSavedMsg(null)
    setEditingId(id)
  }

  const unauthorized = useCallback(() => {
    setAuthed(false)
    setNotice('Your session expired. Please sign in again.')
  }, [])

  const loadPosts = useCallback(async () => {
    setLoadingList(true)
    setListError(null)
    try {
      const res = await api.adminListPosts()
      setPosts(res.posts)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) unauthorized()
      else setListError(describeError(e))
    } finally {
      setLoadingList(false)
    }
  }, [unauthorized])

  useEffect(() => {
    api
      .me()
      .then((r) => setAuthed(r.authenticated))
      .catch((e: unknown) => {
        setAuthed(false)
        setNotice(describeError(e))
      })
  }, [])

  useEffect(() => {
    if (authed) void loadPosts()
  }, [authed, loadPosts])

  const editing = useMemo(() => posts.find((p) => p.id === editingId) ?? null, [posts, editingId])
  const counts = useMemo(() => {
    const c: Record<Badge, number> = { Draft: 0, Scheduled: 0, Published: 0 }
    posts.forEach((p) => c[badgeOf(p)]++)
    return c
  }, [posts])
  const shown = filter === 'All' ? posts : posts.filter((p) => badgeOf(p) === filter)

  const logout = async () => {
    try {
      await api.logout()
    } finally {
      setAuthed(false)
      setNotice(undefined)
      setPosts([])
      setEditingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.adminDeletePost(toDelete.id)
      if (editingId === toDelete.id) setEditingId(null)
      setToDelete(null)
      await loadPosts()
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) unauthorized()
      else setListError(describeError(e))
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8">
      {authed === null && <p className="mt-20 text-center text-sm text-muted">Checking session…</p>}
      {authed === false && (
        <Login
          notice={notice}
          onDone={() => {
            setNotice(undefined)
            setAuthed(true)
          }}
        />
      )}
      {authed && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-medium tracking-tight">Blog admin</h1>
            {USE_MOCKS && <span className="chip text-[10px] text-amber-300">mock data</span>}
            <div className="ml-auto flex gap-2">
              <Link to="/blog" className="btn-ghost">
                <ExternalLink className="size-3.5" aria-hidden="true" /> View blog
              </Link>
              <button onClick={logout} className="btn">
                <LogOut className="size-3.5" aria-hidden="true" /> Log out
              </button>
            </div>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
            <section className={`${panel} p-3`} aria-labelledby="posts-heading">
              <div className="flex items-center gap-2 px-1">
                <h2 id="posts-heading" className="text-lg font-medium tracking-tight">
                  Posts <span className="font-mono text-xs font-normal text-subtle">({posts.length})</span>
                </h2>
                <button onClick={() => selectPost(null)} className="btn-primary ml-auto px-2.5 py-1 text-xs">
                  <Plus className="size-3.5" aria-hidden="true" /> New post
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1 px-1 text-xs" role="group" aria-label="Filter by status">
                {(['All', 'Published', 'Scheduled', 'Draft'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                    className={`rounded-md border px-2 py-1 transition-colors ${filter === f ? 'border-zinc-600 bg-zinc-800 text-fg' : 'border-border text-muted hover:text-fg'}`}
                  >
                    {f} <span className="font-mono text-subtle">{f === 'All' ? posts.length : counts[f]}</span>
                  </button>
                ))}
              </div>
              {listError && (
                <div className="mt-3">
                  <ErrorBanner message={listError} onClose={() => setListError(null)} />
                </div>
              )}
              <ul className="mt-2 divide-y divide-border" aria-busy={loadingList}>
                {shown.map((p) => {
                  const b = badgeOf(p)
                  const active = p.id === editingId
                  return (
                    <li key={p.id} className={`rounded-md px-2 py-2.5 ${active ? 'bg-zinc-800/60 ring-1 ring-zinc-700' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <StatusBadge badge={b} />
                            <span className="truncate font-mono text-[11px] text-subtle">/{p.slug}</span>
                            {p.sourceUrl && (
                              <span className="shrink-0 text-subtle" title={`Original: ${p.sourceUrl}`}>
                                {isLinkedinUrl(p.sourceUrl) ? <LinkedinIcon className="size-3" /> : <ExternalLink className="size-3" aria-hidden="true" />}
                                <span className="sr-only">Has original post link</span>
                              </span>
                            )}
                          </div>
                          <p className="mt-1 leading-snug font-medium text-fg">{p.title}</p>
                          <p className="mt-0.5 text-[11px] text-subtle">
                            {b === 'Scheduled' ? 'Publishes' : b === 'Draft' ? 'Publish date' : 'Published'} {formatLocalDateTime(p.publishedAt)}
                          </p>
                          <p className="text-[11px] text-subtle" title={formatLocalDateTime(p.updatedAt)}>
                            Updated {relativeTime(p.updatedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button onClick={() => selectPost(p.id)} className="rounded-md border border-border px-2 py-0.5 text-xs text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800" aria-label={`Edit ${p.title}`}>
                            Edit
                          </button>
                          <button onClick={() => setToDelete(p)} className="rounded-md border border-red-900/60 px-2 py-0.5 text-xs text-red-300 hover:bg-red-950/50" aria-label={`Delete ${p.title}`}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
                {!loadingList && shown.length === 0 && <li className="py-6 text-center text-sm text-subtle">No posts here.</li>}
              </ul>
            </section>
            <Editor
              editing={editing}
              onCancel={() => selectPost(null)}
              savedMsg={savedMsg}
              setSavedMsg={setSavedMsg}
              onUnauthorized={unauthorized}
              onSaved={(saved) => {
                setPosts((prev) => {
                  const exists = prev.some((p) => p.id === saved.id)
                  const next = exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]
                  return [...next].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || b.id - a.id)
                })
                setEditingId(saved.id)
              }}
            />
          </div>
        </>
      )}
      {toDelete && <ConfirmDelete post={toDelete} busy={deleting} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />}
    </main>
  )
}
