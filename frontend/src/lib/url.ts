/** True for absolute http:// or https:// URLs with a host. */
export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim())
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch {
    return false
  }
}

/** True when the URL's host is linkedin.com or a subdomain of it (www., lnkd...). */
export function isLinkedinUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase()
    return host === 'linkedin.com' || host.endsWith('.linkedin.com') || host === 'lnkd.in'
  } catch {
    return false
  }
}
