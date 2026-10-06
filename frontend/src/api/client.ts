import type {
  AdminPost,
  AdminPostInput,
  AdminPostListResponse,
  ApiErrorBody,
  AuthMeResponse,
  ContactInput,
  GithubResponse,
  OkResponse,
  Post,
  PostListResponse,
} from './types'

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/api'
/** Mocks are ON unless VITE_USE_MOCKS is explicitly "false". */
export const USE_MOCKS: boolean = import.meta.env.VITE_USE_MOCKS !== 'false'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type Fetcher = (input: string, init: RequestInit) => Promise<Response>

let fetcher: Fetcher = (input, init) => fetch(input, init)

/** Swap the transport (used by the mock layer). */
export function setFetcher(f: Fetcher): void {
  fetcher = f
}

function isErrorBody(x: unknown): x is ApiErrorBody {
  return (
    typeof x === 'object' &&
    x !== null &&
    'error' in x &&
    typeof (x as ApiErrorBody).error?.message === 'string'
  )
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: 'include', // httpOnly auth cookie
    headers: body !== undefined ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }
  let res: Response
  try {
    res = await fetcher(`${API_BASE}${path}`, init)
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Please check your connection and try again.')
  }
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  if (!res.ok) {
    if (isErrorBody(data)) throw new ApiError(res.status, data.error.code, data.error.message)
    throw new ApiError(res.status, 'HTTP_ERROR', `Request failed with status ${res.status}`)
  }
  return data as T
}

export const api = {
  // Public blog
  listPosts: (page = 1, limit = 10) =>
    request<PostListResponse>('GET', `/posts?page=${page}&limit=${limit}`),
  getPost: (slug: string) => request<Post>('GET', `/posts/${encodeURIComponent(slug)}`),

  // Auth
  login: (password: string) => request<OkResponse>('POST', '/auth/login', { password }),
  logout: () => request<OkResponse>('POST', '/auth/logout'),
  me: () => request<AuthMeResponse>('GET', '/auth/me'),

  // Admin
  adminListPosts: () => request<AdminPostListResponse>('GET', '/admin/posts'),
  adminCreatePost: (input: AdminPostInput) => request<AdminPost>('POST', '/admin/posts', input),
  adminUpdatePost: (id: number, input: AdminPostInput) =>
    request<AdminPost>('PUT', `/admin/posts/${encodeURIComponent(String(id))}`, input),
  adminDeletePost: (id: number) => request<OkResponse>('DELETE', `/admin/posts/${encodeURIComponent(String(id))}`),

  // Contact
  contact: (input: ContactInput) => request<OkResponse>('POST', '/contact', input),

  // GitHub
  github: () => request<GithubResponse>('GET', '/github'),
}

export type Api = typeof api
