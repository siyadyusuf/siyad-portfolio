import { useEffect, useRef } from 'react'

/**
 * "Patient zero" infection simulation for the YPINR card.
 * A pulsing virus cell infects a network node by node (virions travel along edges, infected
 * nodes sprout spiky replicas and shed particles, the frame glitches), then a green scanner
 * sweeps through and quarantines everything. Loops with a new outbreak each cycle.
 *
 * Every frame is a pure function of (graph, t), so the reduced-motion fallback is simply one
 * frame rendered mid-outbreak. Animation only runs while the canvas is on screen.
 */

// ---------- timeline (seconds) ----------
const SPAWN = 0.6
const SPREAD_END = 6.4
const SCAN_START = 6.9
const SCAN_DUR = 2.3
const FADE_OUT = 10.6
const CYCLE = 11.4
const STATIC_T = 4.6 // frame shown under prefers-reduced-motion

const RED = [255, 64, 96] as const
const GREEN = [74, 222, 128] as const

type RGB = readonly [number, number, number]
interface Node {
  x: number
  y: number
  rot: number
  spin: number
  ang: number // shedding direction
}
interface Graph {
  w: number
  h: number
  nodes: Node[]
  edges: [number, number][]
  neighbors: number[][]
}
interface Outbreak {
  zero: number
  infectAt: Float32Array
  parent: Int32Array
  treeEdges: [number, number][]
}

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const easeOutBack = (x: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`

function buildGraph(w: number, h: number, seed: number): Graph {
  const rand = mulberry32(seed)
  const n = Math.round(Math.min(150, Math.max(55, (w * h) / 1500)))
  const pad = 14
  const nodes: Node[] = []
  // best-candidate sampling -> evenly spread but organic
  for (let i = 0; i < n; i++) {
    let best: Node | null = null
    let bestD = -1
    for (let k = 0; k < 10; k++) {
      const x = pad + rand() * (w - pad * 2)
      const y = pad + rand() * (h - pad * 2)
      let d = Infinity
      for (const p of nodes) d = Math.min(d, (p.x - x) ** 2 + (p.y - y) ** 2)
      if (d > bestD) {
        bestD = d
        best = { x, y, rot: rand() * Math.PI * 2, spin: (rand() - 0.5) * 1.2, ang: rand() * Math.PI * 2 }
      }
    }
    nodes.push(best!)
  }
  const key = new Set<string>()
  const edges: [number, number][] = []
  const neighbors: number[][] = nodes.map(() => [])
  nodes.forEach((a, i) => {
    const near = nodes
      .map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3)
    for (const { j } of near) {
      const k = i < j ? `${i}-${j}` : `${j}-${i}`
      if (key.has(k)) continue
      key.add(k)
      edges.push([i, j])
      neighbors[i].push(j)
      neighbors[j].push(i)
    }
  })
  return { w, h, nodes, edges, neighbors }
}

function buildOutbreak(g: Graph, cycle: number): Outbreak {
  const rand = mulberry32(9001 + cycle * 7919)
  const cx = g.w * (0.5 + (rand() - 0.5) * 0.3)
  const cy = g.h * (0.5 + (rand() - 0.5) * 0.2)
  let zero = 0
  let bd = Infinity
  g.nodes.forEach((p, i) => {
    const d = (p.x - cx) ** 2 + (p.y - cy) ** 2
    if (d < bd) {
      bd = d
      zero = i
    }
  })
  // Dijkstra with jittered weights: the infection takes organic, uneven paths.
  const N = g.nodes.length
  const dist = new Float64Array(N).fill(Infinity)
  const parent = new Int32Array(N).fill(-1)
  const done = new Uint8Array(N)
  const weight = new Map<string, number>()
  for (const [a, b] of g.edges) {
    const len = Math.hypot(g.nodes[a].x - g.nodes[b].x, g.nodes[a].y - g.nodes[b].y)
    const w = len * (0.6 + rand() * 1.4)
    weight.set(`${a}-${b}`, w)
    weight.set(`${b}-${a}`, w)
  }
  dist[zero] = 0
  for (let it = 0; it < N; it++) {
    let u = -1
    for (let i = 0; i < N; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i
    if (u < 0 || dist[u] === Infinity) break
    done[u] = 1
    for (const v of g.neighbors[u]) {
      const nd = dist[u] + weight.get(`${u}-${v}`)!
      if (nd < dist[v]) {
        dist[v] = nd
        parent[v] = u
      }
    }
  }
  let maxD = 0
  dist.forEach((d) => d !== Infinity && (maxD = Math.max(maxD, d)))
  const infectAt = new Float32Array(N)
  const treeEdges: [number, number][] = []
  for (let i = 0; i < N; i++) {
    // unreachable islands get infected late, "airborne"
    infectAt[i] = dist[i] === Infinity ? SPREAD_END - 0.4 + rand() * 0.4 : SPAWN + 0.35 + Math.pow(dist[i] / (maxD || 1), 0.85) * (SPREAD_END - SPAWN - 0.35)
    if (parent[i] >= 0) treeEdges.push([parent[i], i])
  }
  infectAt[zero] = SPAWN
  return { zero, infectAt, parent, treeEdges }
}

function makeGlow(c: RGB, size = 64): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const x = cv.getContext('2d')!
  const gr = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gr.addColorStop(0, rgba(c, 0.9))
  gr.addColorStop(0.25, rgba(c, 0.35))
  gr.addColorStop(1, rgba(c, 0))
  x.fillStyle = gr
  x.fillRect(0, 0, size, size)
  return cv
}

interface FrameInfo {
  infected: number
  cleaned: number
  total: number
  phase: 'idle' | 'spreading' | 'scanning' | 'quarantined'
}

function drawFrame(ctx: CanvasRenderingContext2D, g: Graph, ob: Outbreak, t: number, glows: { red: HTMLCanvasElement; green: HTMLCanvasElement }, dpr: number, glitchSeed: number, motion: boolean): FrameInfo {
  const { w, h, nodes, edges } = g
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const fade = t > FADE_OUT ? 1 - clamp01((t - FADE_OUT) / (CYCLE - FADE_OUT)) : 1
  ctx.globalAlpha = fade

  const scanX = t < SCAN_START ? -1e9 : -40 + ((t - SCAN_START) / SCAN_DUR) * (w + 80)
  // cleaned amount for a point at x (0 = still infected, 1 = quarantined)
  const cleanAt = (x: number) => (t < SCAN_START ? 0 : clamp01((scanX - x) / 40))
  const inf = ob.infectAt
  const infK = (i: number) => clamp01((t - inf[i]) / 0.35)

  // ---- healthy mesh
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(255,255,255,0.065)'
  ctx.beginPath()
  for (const [a, b] of edges) {
    ctx.moveTo(nodes[a].x, nodes[a].y)
    ctx.lineTo(nodes[b].x, nodes[b].y)
  }
  ctx.stroke()

  // ---- infected links (both ends infected): red, turning green behind scanner
  for (const [a, b] of edges) {
    const k = Math.min(infK(a), infK(b))
    if (k <= 0) continue
    const mx = (nodes[a].x + nodes[b].x) / 2
    const c = cleanAt(mx)
    ctx.strokeStyle = rgba(mix(RED, GREEN, c), (0.28 - c * 0.14) * k)
    ctx.beginPath()
    ctx.moveTo(nodes[a].x, nodes[a].y)
    ctx.lineTo(nodes[b].x, nodes[b].y)
    ctx.stroke()
  }

  // ---- virions travelling along the infection tree
  ctx.globalCompositeOperation = 'lighter'
  for (const [p, c] of ob.treeEdges) {
    const t0 = inf[p]
    const t1 = inf[c]
    if (t < t0 || t > t1 + 0.25) continue
    const k = clamp01((t - t0) / (t1 - t0 || 1))
    const A = nodes[p]
    const B = nodes[c]
    const x = A.x + (B.x - A.x) * k
    const y = A.y + (B.y - A.y) * k
    const tail = t > t1 ? 1 - (t - t1) / 0.25 : 1
    const gr = ctx.createLinearGradient(A.x, A.y, x, y)
    gr.addColorStop(0, rgba(RED, 0))
    gr.addColorStop(1, rgba(RED, 0.9 * tail))
    ctx.strokeStyle = gr
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(A.x, A.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (t <= t1) {
      ctx.drawImage(glows.red, x - 9, y - 9, 18, 18)
      ctx.fillStyle = 'rgba(255,220,225,0.95)'
      ctx.beginPath()
      ctx.arc(x, y, 1.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineWidth = 1

  // ---- nodes
  let infected = 0
  let cleaned = 0
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (i === ob.zero) continue
    const k = infK(i)
    if (k <= 0) {
      ctx.fillStyle = 'rgba(161,161,170,0.5)'
      ctx.beginPath()
      ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    infected++
    const c = cleanAt(n.x)
    if (c > 0.5) cleaned++
    const col = mix(RED, GREEN, c)
    const s = easeOutBack(k) * (1 - 0.35 * c)
    const pulse = 0.75 + 0.25 * Math.sin(t * 5 + i)
    // glow
    ctx.globalAlpha = fade * (0.5 * pulse * (1 - c) + 0.25 * c)
    ctx.drawImage(c > 0.5 ? glows.green : glows.red, n.x - 12, n.y - 12, 24, 24)
    ctx.globalAlpha = fade
    // mini virus: core + spikes (spikes retract when quarantined)
    const r = 2.3 * s
    const spikes = 7
    const spikeLen = 2.6 * s * (1 - c)
    const rot = n.rot + t * n.spin
    ctx.strokeStyle = rgba(col, 0.95)
    ctx.fillStyle = rgba(col, 0.95)
    if (spikeLen > 0.2) {
      ctx.beginPath()
      for (let j = 0; j < spikes; j++) {
        const a = rot + (j / spikes) * Math.PI * 2
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        ctx.moveTo(n.x + ca * r, n.y + sa * r)
        ctx.lineTo(n.x + ca * (r + spikeLen), n.y + sa * (r + spikeLen))
      }
      ctx.stroke()
      for (let j = 0; j < spikes; j++) {
        const a = rot + (j / spikes) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(n.x + Math.cos(a) * (r + spikeLen), n.y + Math.sin(a) * (r + spikeLen), 0.75 * s, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.beginPath()
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
    ctx.fillStyle = rgba(mix([60, 8, 18], [8, 40, 22], c), 1)
    ctx.fill()
    ctx.stroke()
    // shed virions right after infection (replication)
    const age = t - inf[i]
    if (age > 0 && age < 1.1 && c === 0) {
      const e = easeOutCubic(age / 1.1)
      ctx.fillStyle = rgba(RED, 0.8 * (1 - age / 1.1))
      for (let q = 0; q < 3; q++) {
        const a = n.ang + q * 2.1
        ctx.beginPath()
        ctx.arc(n.x + Math.cos(a) * (5 + 13 * e), n.y + Math.sin(a) * (5 + 13 * e), 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // quarantine ping
    if (c > 0) {
      const pingAge = (scanX - n.x) / ((w + 80) / SCAN_DUR) // seconds since scanner passed
      if (pingAge > 0 && pingAge < 0.7) {
        const pk = pingAge / 0.7
        ctx.strokeStyle = rgba(GREEN, 0.7 * (1 - pk))
        ctx.beginPath()
        ctx.arc(n.x, n.y, 3 + 11 * easeOutCubic(pk), 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  // ---- patient zero: the big virus cell
  const z = nodes[ob.zero]
  const spawnK = clamp01(t / SPAWN)
  if (spawnK > 0) {
    infected++
    const c = cleanAt(z.x)
    if (c > 0.5) cleaned++
    const col = mix(RED, GREEN, c)
    const R = Math.min(h * 0.12, 30) * easeOutBack(spawnK) * (1 + 0.045 * Math.sin(t * 4.2)) * (1 - 0.3 * c)
    const rot = t * 0.22
    // big glow
    ctx.globalAlpha = fade * (0.55 + 0.15 * Math.sin(t * 4.2))
    ctx.drawImage(c > 0.5 ? glows.green : glows.red, z.x - R * 3.2, z.y - R * 3.2, R * 6.4, R * 6.4)
    ctx.globalAlpha = fade
    // spikes with club heads
    const SP = 14
    ctx.lineWidth = 1.4
    ctx.strokeStyle = rgba(col, 0.9)
    ctx.fillStyle = rgba(col, 0.95)
    for (let j = 0; j < SP; j++) {
      const a = rot + (j / SP) * Math.PI * 2
      const len = R * (0.42 + 0.08 * Math.sin(t * 3 + j * 1.7)) * (1 - c)
      if (len < 0.5) continue
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      ctx.beginPath()
      ctx.moveTo(z.x + ca * R * 0.95, z.y + sa * R * 0.95)
      ctx.lineTo(z.x + ca * (R + len), z.y + sa * (R + len))
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(z.x + ca * (R + len), z.y + sa * (R + len), R * 0.1, 0, Math.PI * 2)
      ctx.fill()
    }
    // wobbling membrane
    ctx.beginPath()
    const STEPS = 72
    for (let s = 0; s <= STEPS; s++) {
      const a = (s / STEPS) * Math.PI * 2
      const rr = R * (1 + 0.025 * Math.sin(5 * a + t * 2.2) + 0.02 * Math.sin(3 * a - t * 1.4) + 0.012 * Math.sin(9 * a + t * 3.1))
      const x = z.x + Math.cos(a + rot) * rr
      const y = z.y + Math.sin(a + rot) * rr
      if (s === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    const body = ctx.createRadialGradient(z.x - R * 0.3, z.y - R * 0.35, R * 0.1, z.x, z.y, R)
    body.addColorStop(0, rgba(mix([120, 20, 40], [20, 90, 50], c), 1))
    body.addColorStop(1, rgba(mix([40, 4, 12], [6, 30, 16], c), 1))
    ctx.fillStyle = body
    ctx.fill()
    ctx.lineWidth = 1.6
    ctx.strokeStyle = rgba(col, 1)
    ctx.stroke()
    // genome squiggles inside
    ctx.save()
    ctx.clip()
    ctx.lineWidth = 1.1
    ctx.strokeStyle = rgba(mix([255, 140, 160], [170, 255, 200], c), 0.55)
    for (let q = 0; q < 3; q++) {
      ctx.beginPath()
      for (let s = 0; s <= 24; s++) {
        const u = s / 24
        const px = z.x + (u - 0.5) * R * 1.6
        const py = z.y + (q - 1) * R * 0.38 + Math.sin(u * 9 + t * 2.4 + q * 2) * R * 0.1
        if (s === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
    }
    ctx.restore()
    ctx.lineWidth = 1
  }

  // ---- scanner sweep
  if (t >= SCAN_START && scanX < w + 40) {
    const trail = ctx.createLinearGradient(scanX - 90, 0, scanX, 0)
    trail.addColorStop(0, rgba(GREEN, 0))
    trail.addColorStop(1, rgba(GREEN, 0.14))
    ctx.fillStyle = trail
    ctx.fillRect(scanX - 90, 0, 90, h)
    ctx.fillStyle = rgba(GREEN, 0.95)
    ctx.fillRect(scanX - 0.75, 0, 1.5, h)
    ctx.fillStyle = rgba(GREEN, 0.7)
    for (let y = 6; y < h; y += 12) ctx.fillRect(scanX - 4, y, 3, 1)
  }

  ctx.globalAlpha = 1

  // ---- glitch: horizontal slice displacement + chroma bars during the outbreak
  if (motion && t > SPAWN && t < SCAN_START) {
    const slot = Math.floor(t * 6) // 6 decisions per second
    const r = mulberry32(glitchSeed * 31 + slot)
    if (r() < 0.16) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      const W = ctx.canvas.width
      const H = ctx.canvas.height
      const bands = 2 + Math.floor(r() * 3)
      for (let b = 0; b < bands; b++) {
        const y = Math.floor(r() * H)
        const bh = Math.max(2, Math.floor(r() * 18 * dpr))
        const dx = Math.round((r() - 0.5) * 24 * dpr)
        ctx.drawImage(ctx.canvas, 0, y, W, bh, dx, y, W, bh)
      }
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = r() < 0.5 ? 'rgba(255,40,80,0.10)' : 'rgba(60,255,140,0.08)'
      ctx.fillRect(0, Math.floor(r() * H), W, Math.floor(2 + r() * 6) * dpr)
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  const phase: FrameInfo['phase'] = t < SPAWN ? 'idle' : t < SCAN_START ? 'spreading' : scanX < w + 40 ? 'scanning' : 'quarantined'
  return { infected, cleaned, total: nodes.length, phase }
}

const PHASE_LABEL: Record<FrameInfo['phase'], string> = {
  idle: 'monitoring',
  spreading: 'outbreak',
  scanning: 'scanning',
  quarantined: 'quarantined',
}

export function VirusCanvas({ className = '' }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const statusRef = useRef<HTMLSpanElement>(null)
  const dotRef = useRef<HTMLSpanElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)
  const countLabelRef = useRef<HTMLSpanElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const glows = { red: makeGlow(RED), green: makeGlow(GREEN) }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')

    let graph: Graph | null = null
    let outbreak: Outbreak | null = null
    let cycle = 0
    let dpr = 1
    let raf = 0
    let visible = false
    let started = false
    let elapsed = 0 // seconds of animation played (survives pauses)
    let last = 0
    let lastHud = 0

    const hud = (info: FrameInfo, t: number) => {
      if (statusRef.current) statusRef.current.textContent = PHASE_LABEL[info.phase]
      if (dotRef.current) dotRef.current.dataset.phase = info.phase
      const q = info.phase === 'scanning' || info.phase === 'quarantined'
      if (countLabelRef.current) countLabelRef.current.textContent = q ? 'quarantined' : 'infected'
      if (countRef.current) countRef.current.textContent = `${String(q ? info.cleaned : info.infected).padStart(3, '0')}/${info.total}`
      if (clockRef.current) clockRef.current.textContent = `t+${t.toFixed(1).padStart(4, '0')}s`
    }

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const w = Math.max(200, Math.round(rect.width))
      const h = Math.max(140, Math.round(rect.height))
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      graph = buildGraph(w, h, 1337)
      outbreak = buildOutbreak(graph, cycle)
      paintStill()
    }

    const paintStill = () => {
      if (!graph || !outbreak) return
      if (mq.matches) {
        hud(drawFrame(ctx, graph, outbreak, STATIC_T, glows, dpr, 0, false), STATIC_T)
        wrap.dataset.state = 'static'
      } else if (!raf) {
        const t = started ? elapsed % CYCLE : 0
        hud(drawFrame(ctx, graph, outbreak, t, glows, dpr, cycle, false), t)
      }
    }

    const frame = (now: number) => {
      raf = 0
      if (!graph || !outbreak) return
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      last = now
      elapsed += dt
      const c = Math.floor(elapsed / CYCLE)
      if (c !== cycle) {
        cycle = c
        outbreak = buildOutbreak(graph, cycle)
      }
      const t = elapsed % CYCLE
      const info = drawFrame(ctx, graph, outbreak, t, glows, dpr, cycle + 1, true)
      if (now - lastHud > 90) {
        hud(info, t)
        lastHud = now
      }
      wrap.dataset.t = t.toFixed(2)
      if (visible && !document.hidden && !mq.matches) raf = requestAnimationFrame(frame)
    }

    const play = () => {
      if (mq.matches || raf || !visible || document.hidden) return
      started = true
      last = 0
      wrap.dataset.state = 'playing'
      raf = requestAnimationFrame(frame)
    }
    const pause = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      if (!mq.matches) wrap.dataset.state = started ? 'paused' : 'waiting'
    }

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting && e.intersectionRatio >= 0.35
        if (visible) play()
        else pause()
      },
      { threshold: [0, 0.35, 0.6] },
    )
    const ro = new ResizeObserver(() => resize())
    const onVis = () => (document.hidden ? pause() : play())
    const onMq = () => {
      pause()
      paintStill()
      play()
    }

    wrap.dataset.state = mq.matches ? 'static' : 'waiting'
    resize()
    ro.observe(wrap)
    io.observe(wrap)
    document.addEventListener('visibilitychange', onVis)
    mq.addEventListener('change', onMq)
    return () => {
      pause()
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      mq.removeEventListener('change', onMq)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden ${className}`}
      role="img"
      aria-label="Animation: a virus infects a network node by node, then a green scanner sweeps across and quarantines every infected node."
      data-testid="virus-canvas"
    >
      <div className="dot-grid absolute inset-0" aria-hidden="true" />
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
      {/* CRT scanlines + vignette */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.5) 0 1px, transparent 1px 3px)' }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(9,9,11,0.85))]" aria-hidden="true" />
      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 font-mono text-[10px] tracking-wider text-zinc-400 uppercase select-none" aria-hidden="true">
        <span className="absolute top-2.5 left-3">ypinr://threat-sim</span>
        <span className="absolute top-2.5 right-3 flex items-center gap-1.5 rounded border border-border bg-bg/70 px-1.5 py-0.5">
          <span ref={dotRef} data-phase="idle" className="virus-dot size-1.5 rounded-full" />
          <span ref={statusRef}>monitoring</span>
        </span>
        <span className="absolute bottom-2.5 left-3">
          <span ref={countLabelRef}>infected</span> <span ref={countRef} className="text-zinc-200">000/0</span>
        </span>
        <span ref={clockRef} className="absolute right-3 bottom-2.5">
          t+00.0s
        </span>
      </div>
    </div>
  )
}
