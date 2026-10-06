import { useEffect } from 'react'

const BASE = 'Siyad Yusuf'

export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE}` : `${BASE} · Computer Science @ George Mason University`
  }, [title])
}
