import { Section } from '../components/Layout'
import { PROFILE } from '../data/resume'

export function About() {
  return (
    <Section id="about" title="About">
      <ul className="space-y-3 p-4 text-[15px] leading-relaxed text-zinc-300 marker:text-subtle [&>li]:ml-5 [&>li]:list-disc [&>li]:pl-1">
        <li>
          I’m Siyad, a <span className="text-fg">Computer Science</span> student at <span className="text-fg">George Mason University</span> (B.S.
          expected May 2027), looking for software engineering internships.
        </li>
        <li>
          I co-founded{' '}
          <a className="link-underline text-fg" href={PROFILE.website} target="_blank" rel="noopener noreferrer">
            YPINR
          </a>
          , an AI scam-prevention platform my 4-person team built at HopHacks 2026 (Johns Hopkins). It detects scam calls and messages and is live at
          yourprinceisnotreal.net.
        </li>
        <li>
          I build across the stack: Python and Java, JavaScript/TypeScript with React, Node.js/Express and PostgreSQL, plus third-party AI APIs from
          ElevenLabs, xAI and OpenAI.
        </li>
        <li>
          On the infrastructure side I run a home lab: a Proxmox server, a VLAN-segmented network and an OPNsense firewall/VPN.
        </li>
      </ul>
    </Section>
  )
}
