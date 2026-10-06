import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Braces,
  Cpu,
  Headset,
  Layers,
  Lock,
  Monitor,
  Network,
  Server,
  Sparkles,
  Tablet,
  Ticket,
  Waypoints,
  Webhook,
  Wrench,
  HardDrive,
  Router,
  Search,
  Laptop,
  Smartphone,
  Globe,
} from 'lucide-react'
import {
  siApple,
  siCss,
  siCursor,
  siElevenlabs,
  siExpress,
  siGit,
  siGithub,
  siGithubactions,
  siGooglechrome,
  siHtml5,
  siInstagram,
  siJavascript,
  siJson,
  siLinux,
  siNodedotjs,
  siOpenjdk,
  siOpnsense,
  siPostgresql,
  siProxmox,
  siPython,
  siReact,
  siTiktok,
  siTypescript,
  siVite,
  type SimpleIcon,
} from 'simple-icons'

type Props = { className?: string; title?: string }

/** Renders a Simple Icons glyph (24x24 viewBox) in currentColor. */
export function BrandIcon({ icon, className = 'size-3.5' }: { icon: SimpleIcon } & Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true" focusable="false">
      <path d={icon.path} />
    </svg>
  )
}

export function GithubIcon({ className = 'size-4' }: Props) {
  return <BrandIcon icon={siGithub} className={className} />
}

export function InstagramIcon({ className = 'size-4' }: Props) {
  return <BrandIcon icon={siInstagram} className={className} />
}

export function TiktokIcon({ className = 'size-4' }: Props) {
  return <BrandIcon icon={siTiktok} className={className} />
}

/** LinkedIn's mark is not in simple-icons; this is a simple "in" glyph. */
export function LinkedinIcon({ className = 'size-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.6h.06c.53-1 1.84-2.05 3.79-2.05 4.05 0 4.8 2.67 4.8 6.13V21h-4v-4.98c0-1.19-.02-2.72-1.66-2.72-1.66 0-1.91 1.3-1.91 2.63V21h-4V9.75Z" />
    </svg>
  )
}

export type SkillIcon = { kind: 'brand'; icon: SimpleIcon } | { kind: 'lucide'; icon: LucideIcon; hex?: string }

const b = (icon: SimpleIcon): SkillIcon => ({ kind: 'brand', icon })
const l = (icon: LucideIcon, hex?: string): SkillIcon => ({ kind: 'lucide', icon, hex })

/** Icon for each skill label used on the site. Falls back to a neutral glyph. */
export const SKILL_ICONS: Record<string, SkillIcon> = {
  Python: b(siPython),
  Java: b(siOpenjdk),
  JavaScript: b(siJavascript),
  TypeScript: b(siTypescript),
  React: b(siReact),
  'Node.js': b(siNodedotjs),
  'Node/Express': b(siNodedotjs),
  Express: b(siExpress),
  HTML: b(siHtml5),
  CSS: b(siCss),
  PostgreSQL: b(siPostgresql),
  'Chrome Extensions (MV3)': b(siGooglechrome),
  'Chrome Extension (MV3)': b(siGooglechrome),
  'xAI Grok API': l(Bot),
  'ElevenLabs API': b(siElevenlabs),
  'OpenAI API': l(Sparkles),
  'OpenAI Vision API': l(Sparkles),
  'REST APIs': l(Webhook),
  JSON: b(siJson),
  'Prompt Engineering': l(Braces),
  Git: b(siGit),
  GitHub: b(siGithub),
  'GitHub Actions': b(siGithubactions),
  'GitHub Pages': l(Globe),
  Cursor: b(siCursor),
  'TCP/IP': l(Network),
  Subnetting: l(Waypoints),
  VLANs: l(Layers),
  'OPNsense Firewall': b(siOpnsense),
  OPNsense: b(siOpnsense),
  'Proxmox Virtualization': b(siProxmox),
  Proxmox: b(siProxmox),
  VPN: l(Lock),
  'Linux/Windows Server Admin': l(Server),
  Linux: b(siLinux),
  'Managed Switch': l(Router),
  'Help Desk & Desktop Support': l(Headset),
  'Ticketing Systems': l(Ticket),
  'PC Hardware & Peripherals': l(Cpu),
  'Windows 10/11': l(Monitor),
  'BIOS/UEFI': l(HardDrive),
  macOS: l(Laptop),
  iOS: l(Smartphone),
  iPadOS: l(Tablet),
  'Apple Hardware': b(siApple),
  Vite: b(siVite),
  'TF-IDF': l(Search),
}

const FALLBACK: SkillIcon = l(Wrench)
export const iconFor = (label: string): SkillIcon => SKILL_ICONS[label] ?? FALLBACK

/** Brand color usable on a dark background (very dark brand colors become white). */
export function hoverColor(icon: SkillIcon): string {
  const hex = icon.kind === 'brand' ? icon.icon.hex : icon.hex
  if (!hex) return '#fafafa'
  const n = parseInt(hex, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const bl = n & 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * bl
  return lum < 90 ? '#fafafa' : `#${hex}`
}

export function SkillGlyph({ label, className = 'size-3.5' }: { label: string; className?: string }) {
  const ic = iconFor(label)
  if (ic.kind === 'brand') return <BrandIcon icon={ic.icon} className={className} />
  const I = ic.icon
  return <I className={className} strokeWidth={1.75} aria-hidden="true" />
}

