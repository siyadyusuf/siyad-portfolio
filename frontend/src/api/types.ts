/** Types mirroring the backend API contract. All dates are ISO 8601 UTC strings. */

export type ISODateString = string

export interface ApiErrorBody {
  error: { code: string; message: string }
}

export interface PostSummary {
  /** Numeric SERIAL id from the backend */
  id: number
  slug: string
  title: string
  excerpt: string
  publishedAt: ISODateString
  /** Optional: the list endpoint may include it (not guaranteed by the contract). */
  sourceUrl?: string | null
}

export interface PostListResponse {
  posts: PostSummary[]
  page: number
  totalPages: number
}

export interface Post {
  id: number
  slug: string
  title: string
  /** Markdown */
  content: string
  publishedAt: ISODateString
  updatedAt: ISODateString
  /** Original post (e.g. on LinkedIn), if this was cross-posted. */
  sourceUrl?: string | null
}

export type PostStatus = 'draft' | 'published'

export interface AdminPost extends Post {
  status: PostStatus
}

export interface AdminPostListResponse {
  posts: AdminPost[]
}

export interface AdminPostInput {
  title: string
  content: string
  publishedAt: ISODateString
  status: PostStatus
  slug?: string
  /** http(s) URL of the original post; null clears it. */
  sourceUrl?: string | null
}

export interface AuthMeResponse {
  authenticated: boolean
}

export interface ContactInput {
  name: string
  email: string
  message: string
  /** Honeypot: must stay empty for real users. */
  website: string
}

export interface OkResponse {
  ok: true
}

export interface GithubRepo {
  name: string
  description: string | null
  url: string
  language: string | null
  stars: number
  updatedAt: ISODateString
}

export interface GithubActivity {
  type: string
  repo: string
  message: string
  url: string
  createdAt: ISODateString
}

export interface ContributionDay {
  /** Calendar date, YYYY-MM-DD */
  date: string
  count: number
}

/** Past ~365 days, oldest first. null when GitHub won't provide it. */
export type Contributions = { total: number; days: ContributionDay[] } | null

export interface GithubResponse {
  repos: GithubRepo[]
  recentActivity: GithubActivity[]
  /** Optional/nullable: older backends omit it, GitHub outages return null. */
  contributions?: Contributions
}
