/**
 * Facts taken from /public/Siyad_Yusuf_Resume.pdf (pdftotext -layout).
 * Do not add anything here that is not in the resume.
 */
export const PROFILE = {
  name: 'Siyad Yusuf',
  email: 'syusuf9@gmu.edu',
  linkedin: 'https://www.linkedin.com/in/siyad-yusuf-08b446263/',
  github: 'https://github.com/siyadyusuf',
  githubUser: 'siyadyusuf',
  /** Exact profile URLs from linktr.ee/siyadyusuf (__NEXT_DATA__ links), fetched 2026-10-06. Not on the resume. */
  instagram: 'https://www.instagram.com/siyadyusuf_',
  tiktok: 'https://www.tiktok.com/@kingyusufff',
  website: 'https://yourprinceisnotreal.net/',
  resumePdf: '/Siyad_Yusuf_Resume.pdf',
}

export interface EducationItem {
  school: string
  location: string
  degree: string
  date: string
}

export const EDUCATION: EducationItem[] = [
  { school: 'George Mason University', location: 'Fairfax, VA', degree: 'B.S. in Computer Science', date: 'Expected May 2027' },
  { school: 'Northern Virginia Community College', location: 'Annandale, VA', degree: 'A.S. in Computer Science', date: 'April 2024' },
]

export const COURSEWORK = ['Data Structures & Algorithms', 'Computer Systems', 'Formal Methods & Models', 'Object-Oriented Programming']

/** Skill groups exactly as they appear on the resume (coursework is shown under Education). */
export const SKILL_GROUPS: { group: string; items: string[] }[] = [
  {
    group: 'Development',
    items: ['Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'HTML', 'CSS', 'PostgreSQL', 'Chrome Extensions (MV3)'],
  },
  { group: 'AI & APIs', items: ['xAI Grok API', 'ElevenLabs API', 'OpenAI API', 'REST APIs', 'JSON', 'Prompt Engineering'] },
  { group: 'Tools', items: ['Git', 'GitHub', 'GitHub Actions', 'GitHub Pages', 'Cursor'] },
  {
    group: 'Networking & Infra',
    items: ['TCP/IP', 'Subnetting', 'VLANs', 'OPNsense Firewall', 'Proxmox Virtualization', 'VPN', 'Linux/Windows Server Admin'],
  },
  { group: 'IT Support', items: ['Help Desk & Desktop Support', 'Ticketing Systems', 'PC Hardware & Peripherals', 'Windows 10/11', 'BIOS/UEFI'] },
  { group: 'Apple Ecosystem', items: ['macOS', 'iOS', 'iPadOS', 'Apple Hardware'] },
]

export interface Project {
  id: string
  name: string
  role?: string
  meta?: string[]
  url?: string
  tech: string[]
  bullets: string[]
}

export const PROJECTS: Project[] = [
  {
    id: 'ypinr',
    name: 'YPINR',
    role: 'Developer & Co-Founder',
    meta: ['4-Person Team', 'HopHacks 2026, Johns Hopkins'],
    url: 'https://yourprinceisnotreal.net/',
    tech: ['React', 'Vite', 'Python', 'PostgreSQL', 'TF-IDF', 'ElevenLabs API', 'xAI Grok API', 'Chrome Extension (MV3)', 'GitHub Actions'],
    bullets: [
      'Co-founded and built an AI scam-prevention platform detecting scam calls and messages, backed by a public encyclopedia of 30+ scam methods; live at yourprinceisnotreal.net.',
      'Integrated 2 third-party AI APIs (ElevenLabs for AI-cloned voice scoring, and xAI Grok for voice transcription + Grok-4 JSON classification) to identify scam type, confidence, and method in real time.',
      'Built an on-device Chrome extension (Manifest V3) flagging risky text across 5 social media platforms with zero data uploaded off-device; awaiting Chrome Web Store verification.',
      'Built Python/Postgres backend with TF-IDF retrieval over 100+ indexed scam records.',
      'Developed React/Vite frontend with automated deployment through GitHub Actions.',
    ],
  },
  {
    id: 'homelab',
    name: 'Networking Home Lab',
    role: 'Personal Infrastructure Project',
    tech: ['Proxmox', 'Linux', 'VLANs', 'Managed Switch', 'OPNsense', 'VPN'],
    bullets: [
      'Repurposed an old HP computer as a home server running Proxmox virtualization, hosting a Linux server VM with headless management and secure remote access over VPN.',
      'Segmented the network with VLANs on a managed switch and configured an OPNsense firewall/VPN to control traffic between segments and protect the network.',
    ],
  },
  {
    id: 'inventory',
    name: 'AI Inventory Management App',
    tech: ['React', 'Node/Express', 'PostgreSQL', 'OpenAI Vision API'],
    bullets: [
      'Built a full-stack inventory tool with React, Node/Express, and PostgreSQL that uses the OpenAI vision API to scan photos of products and add them to a store’s existing inventory.',
      'Included an editable quantity field and an AI-generated short item description, designed for mom-and-pop shops that want simple inventory management.',
    ],
  },
]

/** Recognition: exactly one item, by request. Resume line: "Best ElevenLabs AI Award | HopHacks 2026, Johns Hopkins". */
export const RECOGNITION = [{ title: 'ElevenLabs Best Use of AI', tag: 'Award', detail: ['HopHacks 2026', 'Johns Hopkins'], project: 'YPINR' }]
