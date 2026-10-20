import type { APIRoute } from 'astro'
import { nav } from '../nav'

const meta = import.meta.glob<{ description: string }>('/src/pages/docs/**/*.mdx', {
  import: 'frontmatter',
  eager: true,
})
const fileOf = (href: string) => `/src/pages${href}${href === '/docs' ? '/index' : ''}.mdx`

/** https://llmstxt.org — an index of the Markdown copy of every docs page. */
export const GET: APIRoute = ({ site }) => {
  const url = (path: string) => (site ? new URL(path, site).href : path)
  const lines = [
    '# Lightbox',
    '',
    '> A headless React lightbox with native-feeling gestures, built on Base UI and Motion. It ships behaviour only, no CSS: you style every part.',
    '',
    'Package: `@frontendsupply/lightbox`. Install with `pnpm add @frontendsupply/lightbox @base-ui/react motion` (React 19+).',
    ...nav.flatMap((group) => [
      '',
      `## ${group.title}`,
      '',
      ...group.links.map(([label, href]) => `- [${label}](${url(`${href}.md`)}): ${meta[fileOf(href)]!.description}`),
    ]),
  ]
  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
