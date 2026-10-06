import { Column } from '../components/Layout'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { About } from '../sections/About'
import { Contact } from '../sections/Contact'
import { Education, Recognition } from '../sections/Education'
import { GitHubSection } from '../sections/GitHub'
import { Intro } from '../sections/Intro'
import { Projects } from '../sections/Projects'
import { Stack } from '../sections/Stack'

export default function Home() {
  useDocumentTitle()
  return (
    <main id="main">
      <Column>
        <Intro />
        <About />
        <Stack />
        <Education />
        <Recognition />
        <Projects />
        <GitHubSection />
        <Contact />
      </Column>
    </main>
  )
}
