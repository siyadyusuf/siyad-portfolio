import { CheckCircle2, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError, api } from '../api/client'
import { Section } from '../components/Layout'
import { PROFILE } from '../data/resume'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' })
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus({ kind: 'sending' })
    try {
      await api.contact({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim(), website: form.website })
      setStatus({ kind: 'sent' })
      setForm({ name: '', email: '', message: '', website: '' })
    } catch (err) {
      let message = 'Something went wrong sending your message. Please try again, or email me directly.'
      if (err instanceof ApiError) {
        if (err.status === 429) message = 'Thanks for the enthusiasm! You’ve sent a few messages already, so please try again a bit later (or just email me).'
        else if (err.status === 400) message = err.message.replace(/^(\w+):\s*/, (_, f: string) => `${f[0].toUpperCase()}${f.slice(1)}: `)
        else if (err.status === 0) message = err.message
      }
      setStatus({ kind: 'error', message })
    }
  }

  const label = 'mb-1 block font-mono text-[11px] tracking-wider text-subtle uppercase'
  return (
    <Section id="contact" title="Contact">
      <div className="screen-line-bottom grid gap-0 sm:grid-cols-[14rem_1fr]">
        <div className="p-4 text-sm leading-relaxed text-muted sm:border-r sm:border-dashed sm:border-line">
          <p>Have an internship opening or a question? Send a note here or email</p>
          <a className="link-underline mt-1 inline-block font-mono text-zinc-200" href={`mailto:${PROFILE.email}`}>
            {PROFILE.email}
          </a>
        </div>
        {status.kind === 'sent' ? (
          <div role="status" className="flex flex-col items-start gap-3 p-4">
            <p className="flex items-center gap-2 text-fg">
              <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
              Message sent. Thanks, I’ll get back to you soon.
            </p>
            <button type="button" className="btn-ghost" onClick={() => setStatus({ kind: 'idle' })}>
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3 p-4 sm:grid-cols-2" noValidate={false}>
            <div>
              <label htmlFor="c-name" className={label}>
                Name
              </label>
              <input id="c-name" required maxLength={100} autoComplete="name" value={form.name} onChange={set('name')} className="field" />
            </div>
            <div>
              <label htmlFor="c-email" className={label}>
                Email
              </label>
              <input id="c-email" type="email" required maxLength={200} autoComplete="email" value={form.email} onChange={set('email')} className="field" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-message" className={label}>
                Message
              </label>
              <textarea id="c-message" required maxLength={5000} rows={4} value={form.message} onChange={set('message')} className="field resize-y" />
            </div>
            {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
            <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
              <label htmlFor="c-website">Website</label>
              <input id="c-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </div>
            {status.kind === 'error' && (
              <p role="alert" className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200 sm:col-span-2">
                {status.message}
              </p>
            )}
            <div className="flex items-center justify-end sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={status.kind === 'sending'}>
                <Send className="size-3.5" aria-hidden="true" />
                {status.kind === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Section>
  )
}
