import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ScrollManager, SiteFooter, SiteHeader } from './components/Layout'
import Home from './pages/Home'
import NotFound from './pages/NotFound'

const Admin = lazy(() => import('./pages/Admin'))
const Blog = lazy(() => import('./pages/Blog'))

const Fallback = () => <div className="min-h-[60vh]" />

export default function App() {
  // /blog is a full-screen, immersive "phone" experience without the site chrome.
  const immersive = /^\/blog(\/|$)/.test(useLocation().pathname)
  if (immersive)
    return (
      <Suspense fallback={<div className="fixed inset-0 bg-bg" />}>
        <Routes>
          <Route path="/blog/:slug?" element={<Blog />} />
        </Routes>
      </Suspense>
    )
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip">
      <ScrollManager />
      <SiteHeader />
      <div className="flex-1">
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      <SiteFooter />
    </div>
  )
}
