/** Docs pages in reading order: the sidebar, the Markdown copies and llms.txt all follow it. */
export const nav: { title: string; links: [label: string, href: string][] }[] = [
  { title: 'Guide', links: [
    ['Getting started', '/docs'],
    ['Gestures', '/docs/gestures'],
    ['Styling', '/docs/styling'],
    ['API reference', '/docs/api'],
  ] },
  { title: 'Examples', links: [
    ['Feed', '/docs/examples/feed'],
    ['Listing', '/docs/examples/listing'],
    ['Stories', '/docs/examples/stories'],
  ] },
]
