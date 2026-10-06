import { ArrowRight, CircleDot, FolderGit2, GitBranch, GitCommitHorizontal, GitFork, GitPullRequest, Star, Tag } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { ApiError, api, USE_MOCKS } from '../api/client'
import type { GithubActivity, GithubResponse } from '../api/types'
import { ContributionGraph } from '../components/ContributionGraph'
import { Section } from '../components/Layout'
import { GithubIcon } from '../components/icons'
import { PROFILE } from '../data/resume'
import { formatLocalDateTime, relativeTime } from '../lib/dates'

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  HTML: '#e34c26',
  CSS: '#663399',
  Shell: '#89e051',
  'C++': '#f34b7d',
  C: '#555555',
  Go: '#00ADD8',
  Rust: '#dea584',
}

function useGithub() {
  const [data, setData] = useState<GithubResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    api
      .github()
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(e instanceof ApiError ? e.message : 'GitHub data is unavailable right now.'))
    return () => {
      alive = false
    }
  }, [])
  return { data, error, loading: !data && !error }
}

const ACT_ICON: Record<string, ReactNode> = {
  PushEvent: <GitCommitHorizontal className="size-3.5" aria-hidden="true" />,
  CreateEvent: <GitBranch className="size-3.5" aria-hidden="true" />,
  PullRequestEvent: <GitPullRequest className="size-3.5" aria-hidden="true" />,
  IssuesEvent: <CircleDot className="size-3.5" aria-hidden="true" />,
  ReleaseEvent: <Tag className="size-3.5" aria-hidden="true" />,
  WatchEvent: <Star className="size-3.5" aria-hidden="true" />,
  ForkEvent: <GitFork className="size-3.5" aria-hidden="true" />,
}

/** Make terse event messages read naturally ("Pushed 0 commits" -> "Pushed to main"). */
function activityText(a: GithubActivity): string {
  const m = a.message?.trim() || a.type.replace(/Event$/, '')
  if (/^Pushed 0 commits?$/i.test(m)) return 'Pushed changes'
  return m.charAt(0).toUpperCase() + m.slice(1)
}

/** Collapse consecutive identical events (e.g. five pushes to the same repo) into one row with a count. */
function groupActivity(list: GithubActivity[]): (GithubActivity & { times: number })[] {
  const out: (GithubActivity & { times: number })[] = []
  for (const a of list) {
    const prev = out[out.length - 1]
    if (prev && prev.type === a.type && prev.repo === a.repo && activityText(prev) === activityText(a)) prev.times++
    else out.push({ ...a, times: 1 })
  }
  return out
}

function SubHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="screen-line-bottom screen-line-top flex items-center justify-between px-4 py-2">
      <h3 className="font-mono text-[11px] tracking-wider text-subtle uppercase">{children}</h3>
      {aside}
    </div>
  )
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div className="screen-line-bottom px-4 py-6 text-center text-sm text-muted">
      {children}{' '}
      <a className="link-underline text-fg" href={PROFILE.github} target="_blank" rel="noopener noreferrer">
        github.com/{PROFILE.githubUser}
      </a>
    </div>
  )
}

export function GitHubSection() {
  const { data, error, loading } = useGithub()
  const repos = (data?.repos ?? []).slice(0, 4)
  const activity = groupActivity(data?.recentActivity ?? []).slice(0, 5)

  return (
    <Section
      id="github"
      title="GitHub"
      aside={
        USE_MOCKS ? (
          <span className="chip text-[10px] text-amber-300" title="VITE_USE_MOCKS=true">
            sample data
          </span>
        ) : undefined
      }
    >
      <ContributionGraph data={data?.contributions} loading={loading} />

      {error && (
        <div role="status" className="screen-line-top px-4 py-3 text-sm text-muted">
          {error} Repos and activity will show up here once GitHub responds.
        </div>
      )}

      <SubHeading aside={<span className="font-mono text-[11px] text-subtle">{loading ? '…' : `${data?.repos.length ?? 0} public`}</span>}>
        Recent repositories
      </SubHeading>
      {loading ? (
        <div className="grid sm:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className={`screen-line-bottom space-y-2 p-4 ${i === 0 ? 'sm:border-r sm:border-line' : ''}`}>
              <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-900" />
            </div>
          ))}
        </div>
      ) : repos.length === 0 ? (
        <EmptyNote>No public repositories to show yet. Find me at</EmptyNote>
      ) : (
        <ul className="grid sm:grid-cols-2">
          {repos.map((r, i) => (
            <li key={r.url + r.name} className={`screen-line-bottom ${i % 2 === 0 ? 'sm:border-r sm:border-line' : ''}`}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="group flex h-full flex-col gap-1.5 p-4 transition-colors hover:bg-zinc-900/40">
                <span className="flex items-center gap-2">
                  <FolderGit2 className="size-4 shrink-0 text-subtle transition-colors group-hover:text-fg" aria-hidden="true" />
                  <span className="truncate font-medium text-fg">{r.name}</span>
                  <ArrowRight className="ml-auto size-3.5 shrink-0 -translate-x-1 text-subtle opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
                </span>
                <span className="line-clamp-2 text-sm text-muted">{r.description || 'No description.'}</span>
                <span className="mt-auto flex flex-wrap items-center gap-x-3 pt-1 font-mono text-[11px] text-subtle">
                  {r.language && (
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: LANG_COLORS[r.language] ?? '#a1a1aa' }} aria-hidden="true" />
                      {r.language}
                    </span>
                  )}
                  <span className="flex items-center gap-1" aria-label={`${r.stars} stars`}>
                    <Star className="size-3" aria-hidden="true" />
                    {r.stars}
                  </span>
                  <span title={formatLocalDateTime(r.updatedAt)}>updated {relativeTime(r.updatedAt)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <SubHeading>Recent activity</SubHeading>
      {loading ? (
        <div className="screen-line-bottom space-y-3 p-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-zinc-900" style={{ width: `${80 - i * 15}%` }} />
          ))}
        </div>
      ) : activity.length === 0 ? (
        <EmptyNote>No public activity yet. It’ll appear here automatically; meanwhile see</EmptyNote>
      ) : (
        <ol className="screen-line-bottom py-1">
          {activity.map((a, i) => (
            <li key={`${a.createdAt}-${i}`}>
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-zinc-900/40">
                <span className="icon-box">{ACT_ICON[a.type] ?? <GithubIcon className="size-3" />}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">
                  {activityText(a)}
                  {a.times > 1 && <span className="ml-1.5 rounded border border-border px-1 font-mono text-[10px] text-muted">×{a.times}</span>}{' '}
                  <span className="font-mono text-xs text-subtle">· {a.repo}</span>
                </span>
                <time dateTime={a.createdAt} title={formatLocalDateTime(a.createdAt)} className="shrink-0 font-mono text-[11px] text-subtle">
                  {relativeTime(a.createdAt)}
                </time>
              </a>
            </li>
          ))}
        </ol>
      )}

      <div className="screen-line-bottom flex justify-center py-3">
        <a href={PROFILE.github} target="_blank" rel="noopener noreferrer" className="btn">
          <GithubIcon className="size-3.5" />
          View on GitHub
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </Section>
  )
}
