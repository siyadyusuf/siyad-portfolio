// Usage: node scripts/shoot.mjs [shots...]   (env: MOCK_URL, LIVE_URL, OUT)
// shots: full top mobile ypinr skills github github-live blog post admin video empty
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'

const MOCK = process.env.MOCK_URL ?? 'http://localhost:5173'
const LIVE = process.env.LIVE_URL ?? 'http://localhost:5174'
const OUT = process.env.OUT ?? 'screenshots'
const only = process.argv.slice(2)
const want = (n) => only.length === 0 || only.includes(n)
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const errors = []
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: 'dark', ...opts })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  return { ctx, page }
}
const ready = async (page) => {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(900)
}
/** Scroll through the page so lazy bits load, then return to top. */
const warm = async (page) => {
  const h = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((y) => window.scrollTo(0, y), y)
    await page.waitForTimeout(60)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
}
if (want('full') || want('top')) {
  const { ctx, page } = await newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(MOCK + '/', { waitUntil: 'networkidle' })
  await ready(page)
  await warm(page)
  if (want('full')) await page.screenshot({ path: `${OUT}/01-home-full-1440.png`, fullPage: true })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(2500) // let the terminal finish typing
  if (want('top')) await page.screenshot({ path: `${OUT}/02-home-top-1280x800.png` })
  await ctx.close()
}

if (want('ypinr')) {
  const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
  await page.goto(MOCK + '/', { waitUntil: 'networkidle' })
  await ready(page)
  await page.locator('#ypinr').scrollIntoViewIfNeeded()
  await page.evaluate(() => document.getElementById('ypinr').scrollIntoView({ block: 'start' }))
  await page.waitForFunction(() => Number(document.querySelector('[data-testid=virus-canvas]')?.dataset.t ?? 0) > 3.9, null, { timeout: 15000 })
  await page.locator('#ypinr').screenshot({ path: `${OUT}/03-ypinr-animation-mid.png` })
  await page.waitForFunction(() => Number(document.querySelector('[data-testid=virus-canvas]')?.dataset.t ?? 0) > 8.0, null, { timeout: 15000 })
  await page.locator('[data-testid=virus-canvas]').screenshot({ path: `${OUT}/03b-ypinr-scanning.png` })
  await ctx.close()
}

if (want('skills')) {
  const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
  await page.goto(MOCK + '/', { waitUntil: 'networkidle' })
  await ready(page)
  await page.locator('#stack').scrollIntoViewIfNeeded()
  await page.locator('#stack li', { hasText: 'React' }).first().hover()
  await page.waitForTimeout(400)
  await page.locator('#stack').screenshot({ path: `${OUT}/04-skills-grid.png` })
  await ctx.close()
}

if (want('github') || want('github-live')) {
  for (const [base, name] of [
    [LIVE, '05-github-live-api.png'],
    [MOCK, '05b-github-mock.png'],
  ]) {
    if (base === LIVE && !want('github-live') && !want('github')) continue
    const { ctx, page } = await newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
    await page.goto(base + '/#github', { waitUntil: 'networkidle' })
    await ready(page)
    await page.locator('#github figure svg rect').first().waitFor()
    await page.waitForTimeout(800)
    await page.locator('#github').screenshot({ path: `${OUT}/${name}` })
    await ctx.close()
  }
}

if (want('empty')) {
  const { ctx, page } = await newPage({ viewport: { width: 1280, height: 900 } })
  for (const m of ['empty', 'null']) {
    await page.goto(MOCK + `/?mockGithub=${m}#github`, { waitUntil: 'networkidle' })
    await ready(page)
    await page.locator('#github').screenshot({ path: `${OUT}/05c-github-${m}-state.png` })
  }
  await ctx.close()
}

if (want('blog') || want('post')) {
  const sizes = [
    [1440, 900, 'desktop-1440x900', {}],
    [1280, 800, 'desktop-1280x800', {}],
    [390, 844, 'mobile-390x844', { deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ]
  for (const [w, h, label, extra] of sizes) {
    const { ctx, page } = await newPage({ viewport: { width: w, height: h }, ...extra })
    await page.goto(MOCK + '/blog', { waitUntil: 'networkidle' })
    await page.locator('[aria-label="Blog posts"] li a').first().waitFor()
    await ready(page)
    await page.waitForTimeout(1200) // entrance + glitch finished
    if (want('blog')) await page.screenshot({ path: `${OUT}/06-blog-phone-${label}.png` })
    if (want('post') && label !== 'desktop-1280x800') {
      // the sample post that carries a (sample) sourceUrl, scrolled so the "View on LinkedIn" link shows
      await page.locator('[aria-label="Blog posts"] li a', { hasText: 'Notes from my home lab' }).click()
      await page.waitForSelector('[data-testid=phone-post] [data-testid=post-source]')
      await page.waitForTimeout(700)
      await page.evaluate(() => {
        const sc = document.querySelector('[data-testid=phone-post]')
        sc.scrollTo({ top: sc.scrollHeight, behavior: 'instant' })
      })
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${OUT}/07-blog-post-in-phone-${label}.png` })
    }
    await ctx.close()
  }
}

if (only.includes('blog-mid')) {
  const { ctx, page } = await newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(MOCK + '/blog', { waitUntil: 'networkidle' })
  await ready(page)
  for (const [ms, name] of [[420, '06d-blog-entrance-rotating'], [1110, '06e-blog-entrance-power-on'], [1440, '06f-blog-entrance-glitch']]) {
    // freeze every CSS animation at the same moment of the entrance timeline
    await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms }), ms)
    await page.waitForTimeout(150)
    await page.screenshot({ path: `${OUT}/${name}.png` })
  }
  await ctx.close()
}

if (want('links')) {
  const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
  await page.goto(MOCK + '/', { waitUntil: 'networkidle' })
  await ready(page)
  await page.locator('a[aria-label^="Instagram"]').first().hover()
  await page.waitForTimeout(300)
  const box = await page.locator('section[aria-labelledby=intro-name]').boundingBox()
  await page.screenshot({ path: `${OUT}/02b-intro-social-links.png`, clip: { x: box.x, y: box.y + 200, width: box.width, height: box.height - 200 } })
  await ctx.close()
}

if (want('blog-video')) {
  const vdir = `${OUT}/.video-tmp2`
  rmSync(vdir, { recursive: true, force: true })
  const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: vdir, size: { width: 1280, height: 800 } } })
  await page.goto(MOCK + '/', { waitUntil: 'networkidle' })
  await ready(page)
  await page.waitForTimeout(700)
  await page.locator('header nav a', { hasText: 'Blog' }).first().click()
  await page.waitForTimeout(3200)
  await page.locator('[aria-label="Blog posts"] li a').first().click()
  await page.waitForTimeout(1800)
  await page.locator('nav[aria-label=Blog] a', { hasText: 'Posts' }).click()
  await page.waitForTimeout(1000)
  await ctx.close()
  const f = readdirSync(vdir).find((x) => x.endsWith('.webm'))
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${vdir}/${f}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', `${OUT}/blog-entrance.mp4`])
  rmSync(vdir, { recursive: true, force: true })
}

if (want('admin')) {
  const { ctx, page } = await newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(MOCK + '/admin', { waitUntil: 'networkidle' })
  await ready(page)
  await page.screenshot({ path: `${OUT}/08a-admin-login.png` })
  await page.fill('#admin-password', 'letmein')
  await page.click('button[type=submit]')
  await page.waitForSelector('#posts-heading')
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: /^Edit Sample post: Notes from my home lab/ }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/08-admin-editor.png`, fullPage: true })
  await ctx.close()
}

if (want('mobile')) {
  const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(MOCK + '/', { waitUntil: 'networkidle' })
  await ready(page)
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${OUT}/09-mobile-390x844.png` })
  await warm(page)
  await page.screenshot({ path: `${OUT}/09b-mobile-full.png`, fullPage: true })
  await ctx.close()
}

if (only.includes('og')) {
  const { ctx, page } = await newPage({ viewport: { width: 1200, height: 630 } })
  await page.goto(MOCK + '/', { waitUntil: 'networkidle' })
  await ready(page)
  await page.waitForTimeout(2500)
  await page.screenshot({ path: 'public/og-image.png' })
  await ctx.close()
}

if (want('video')) {
  const vdir = `${OUT}/.video-tmp`
  rmSync(vdir, { recursive: true, force: true })
  const { ctx, page } = await newPage({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: vdir, size: { width: 1280, height: 720 } } })
  await page.goto(MOCK + '/#education', { waitUntil: 'networkidle' })
  await ready(page)
  await page.waitForTimeout(600)
  // smooth scroll down to the YPINR card so the animation starts as it enters the viewport
  const target = await page.evaluate(() => document.getElementById('ypinr').getBoundingClientRect().top + window.scrollY - 70)
  const start = await page.evaluate(() => window.scrollY)
  for (let i = 1; i <= 60; i++) {
    const k = i / 60
    const e = 1 - Math.pow(1 - k, 3)
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), start + (target - start) * e)
    await page.waitForTimeout(25)
  }
  await page.waitForTimeout(11500)
  await ctx.close()
  const f = readdirSync(vdir).find((x) => x.endsWith('.webm'))
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${vdir}/${f}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', `${OUT}/ypinr.mp4`])
  rmSync(vdir, { recursive: true, force: true })
}

await browser.close()
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'))
else console.log('done, no console errors')
