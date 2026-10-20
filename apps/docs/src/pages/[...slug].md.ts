import type { APIRoute, GetStaticPaths } from 'astro'

const fence = '```'
type Frontmatter = { title: string; description?: string }
const raw = import.meta.glob<string>('/src/pages/docs/**/*.mdx', { query: '?raw', import: 'default', eager: true })
const meta = import.meta.glob<Frontmatter>('/src/pages/docs/**/*.mdx', { import: 'frontmatter', eager: true })
const sources = import.meta.glob<string>('/src/components/**/*.tsx', { query: '?raw', import: 'default', eager: true })

/** Every docs page as plain Markdown, next to its HTML: /docs/gestures → /docs/gestures.md */
export const getStaticPaths = (() =>
  Object.keys(raw).map((file) => ({
    params: { slug: file.replace(/^\/src\/pages\//, '').replace(/(\/index)?\.mdx$/, '') },
    props: { file },
  }))) satisfies GetStaticPaths

/** Frontmatter becomes the heading, imports and live demos go, `<Code code={x} />` becomes x's source. */
function toMarkdown(file: string) {
  const body = raw[file]!.replace(/^---\n[\s\S]*?\n---\n/, '')
  const imported = Object.fromEntries(
    [...body.matchAll(/^import (\w+) from '(.+)\?raw'$/gm)].map(([, name, path]) => [
      name,
      sources[new URL(path!, `file://${file}`).pathname],
    ]),
  )
  const { title, description } = meta[file]!
  const content = body
    .replace(/^(?:import .*\n)+/, '') // the MDX imports up top, not `import` lines inside code fences
    .replace(/^<Demo>.*<\/Demo>\n/gm, '')
    .replace(
      /^<Code code=\{(\w+)\} lang="(\w+)" \/>$/gm,
      (_, name: string, lang: string) => `${fence}${lang}\n${imported[name]!.trimEnd()}\n${fence}`,
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return `# ${title}\n\n${description ? `${description}\n\n` : ''}${content}\n`
}

export const GET: APIRoute = ({ props }) =>
  new Response(toMarkdown(props.file), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
