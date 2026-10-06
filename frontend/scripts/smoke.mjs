// Functional smoke tests against the mock (5173) and live-backend (5174) dev servers.
import { chromium } from 'playwright'
const MOCK = 'http://localhost:5173', LIVE = 'http://localhost:5174'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const log = (...a) => console.log(...a)
const errs = []
const mk = async (o = {}) => { const c = await b.newContext({ viewport: { width: 1280, height: 800 }, ...o }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); return { c, p } }

// 1. reduced motion -> static frame, never plays
{ const { c, p } = await mk({ reducedMotion: 'reduce' })
  await p.goto(MOCK + '/#projects', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  const st = await p.$eval('[data-testid=virus-canvas]', e => [e.dataset.state, e.dataset.t ?? 'none'])
  log('reduced-motion state:', st)
  await p.locator('[data-testid=virus-canvas]').screenshot({ path: 'screenshots/03c-ypinr-reduced-motion-static.png' })
  await c.close() }

// 2. animation waits until visible, pauses when scrolled away
{ const { c, p } = await mk()
  await p.goto(MOCK + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800)
  const before = await p.$eval('[data-testid=virus-canvas]', e => e.dataset.state)
  await p.evaluate(() => document.getElementById('ypinr').scrollIntoView()); await p.waitForTimeout(1200)
  const during = await p.$eval('[data-testid=virus-canvas]', e => [e.dataset.state, e.dataset.t])
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600)
  const after = await p.$eval('[data-testid=virus-canvas]', e => e.dataset.state)
  // fps sample while visible
  await p.evaluate(() => document.getElementById('ypinr').scrollIntoView()); await p.waitForTimeout(300)
  const fps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : r(n / 2) }; requestAnimationFrame(f) }))
  log('io states:', before, during, after, 'fps≈', fps)
  await c.close() }

// 3. /blog phone: load more, open post inside phone, back, Escape, way home, reduced motion
{ const { c, p } = await mk()
  await p.goto(MOCK + '/blog', { waitUntil: 'networkidle' }); await p.waitForTimeout(1800)
  const items = () => p.locator('[aria-label="Blog posts"] > li a').count()
  const n1 = await items()
  await p.getByRole('button', { name: 'Load more' }).click(); await p.waitForTimeout(900)
  log('phone list items', n1, '-> after load more', await items(), '|', await p.locator('text=/page \\d of \\d/').innerText())
  await p.locator('[aria-label="Blog posts"] li a').first().click(); await p.waitForTimeout(900)
  log('post url', p.url().replace(MOCK, ''), '| title', await p.locator('[data-testid=phone-post] h1').innerText(), '| focused', await p.evaluate(() => document.activeElement?.tagName))
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  log('after Escape url', p.url().replace(MOCK, ''), '| list items kept', await items())
  await p.locator('nav[aria-label=Blog] a', { hasText: 'Site' }).click(); await p.waitForTimeout(600)
  log('Site link ->', p.url().replace(MOCK, ''), '| home h1', await p.locator('h1').first().innerText())
  await p.goto(MOCK + '/blog/sample-scheduled', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  log('scheduled post in phone:', await p.locator('[data-testid=phone-post] h1').innerText())
  await c.close() }
{ const { c, p } = await mk({ reducedMotion: 'reduce' })
  await p.goto(MOCK + '/blog', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  const anims = await p.evaluate(() => document.getAnimations().filter(a => a.effect?.target?.closest?.('.phone')).length)
  const offVisible = await p.$eval('.crt-off', e => getComputedStyle(e).display)
  log('reduced-motion /blog: running entrance animations =', anims, '| screen-off layer display =', offVisible)
  await p.screenshot({ path: 'screenshots/06g-blog-reduced-motion.png' })
  await c.close() }

// 4. contact form: success, honeypot, then 429 (mock allows 5/hour)
{ const { c, p } = await mk()
  await p.goto(MOCK + '/#contact', { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
  for (let i = 0; i < 6; i++) {
    if (await p.getByRole('button', { name: 'Send another' }).count()) await p.getByRole('button', { name: 'Send another' }).click()
    await p.fill('#c-name', 'Test'); await p.fill('#c-email', 't@example.com'); await p.fill('#c-message', 'hello ' + i)
    await p.getByRole('button', { name: 'Send message' }).click(); await p.waitForTimeout(700)
  }
  const alert = await p.locator('#contact [role=alert]').innerText().catch(() => 'none')
  log('contact after 6 sends:', alert)
  await p.locator('#contact').screenshot({ path: 'screenshots/10-contact-429.png' })
  const hp = await p.$eval('#c-website', e => [e.tabIndex, getComputedStyle(e.parentElement).position])
  log('honeypot:', hp)
  await c.close() }

// 5. real backend: public blog + admin flow (create scheduled post, check badge, delete)
{ const { c, p } = await mk({ viewport: { width: 1440, height: 1000 } })
  await p.goto(LIVE + '/blog', { waitUntil: 'networkidle' }); await p.waitForTimeout(1800)
  log('live /blog titles:', await p.locator('[aria-label="Blog posts"] li h2').allInnerTexts())
  await p.goto(LIVE + '/admin', { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
  await p.fill('#admin-password', 'wrong'); await p.click('form button[type=submit]'); await p.waitForTimeout(700)
  log('wrong pw:', await p.locator('[role=alert]').innerText().catch(() => 'none'))
  await p.fill('#admin-password', 'dev'); await p.click('form button[type=submit]'); await p.waitForSelector('#posts-heading'); await p.waitForTimeout(800)
  log('live admin badges:', (await p.locator('section[aria-labelledby=posts-heading] li').allInnerTexts()).map(t => t.split('\n').slice(0, 3).join(' | ')))
  await p.fill('#post-title', 'Frontend smoke test (temporary)')
  await p.fill('#post-content', '# Temp\n\nCreated by the frontend smoke test and deleted right after.')
  const future = new Date(Date.now() + 2 * 86400e3); const pad = n => String(n).padStart(2, '0')
  await p.fill('#post-date', `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T09:30`)
  await p.check('input[value=published]')
  const sentAs = await p.locator('text=Sent as UTC').innerText()
  await p.getByRole('button', { name: 'Create post' }).click(); await p.waitForTimeout(1000)
  log('create:', await p.locator('[role=status]').innerText().catch(() => 'none'), '|', sentAs)
  const row = p.locator('section[aria-labelledby=posts-heading] li', { hasText: 'Frontend smoke test' })
  log('new row:', (await row.innerText()).split('\n').slice(0, 2).join(' | '))
  await p.screenshot({ path: 'screenshots/08b-admin-live-backend.png', fullPage: true })
  await row.getByRole('button', { name: /^Delete/ }).click(); await p.waitForTimeout(300)
  log('dialog:', await p.locator('[role=alertdialog] h2').innerText())
  await p.locator('[role=alertdialog]').getByRole('button', { name: 'Delete' }).click(); await p.waitForTimeout(1000)
  log('after delete rows w/ smoke:', await p.locator('section[aria-labelledby=posts-heading] li', { hasText: 'Frontend smoke test' }).count())
  await p.getByRole('button', { name: /Log out/ }).click(); await p.waitForTimeout(500)
  log('after logout login visible:', await p.locator('#admin-password').count())
  await c.close() }

await b.close()
log(errs.length ? 'ERRORS: ' + [...new Set(errs)].join(' || ') : 'no page errors')
