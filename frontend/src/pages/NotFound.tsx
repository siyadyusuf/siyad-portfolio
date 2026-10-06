import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Column } from '../components/Layout'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Not found')
  return (
    <main id="main">
      <Column className="px-4 py-24 text-center">
        <p className="font-mono text-sm text-subtle">404</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">This page doesn’t exist</h1>
        <Link to="/" className="btn mt-6">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Back home
        </Link>
      </Column>
    </main>
  )
}
