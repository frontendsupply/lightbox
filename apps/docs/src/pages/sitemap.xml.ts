import type { APIRoute } from 'astro'
import { nav } from '../nav'

/** The home page, the agent guide and every docs page in the nav. robots.txt points here. */
export const GET: APIRoute = ({ site }) => {
  const paths = ['/', '/agent', ...nav.flatMap((group) => group.links.map(([, href]) => href))]
  const urls = paths.map((path) => `  <url><loc>${new URL(path, site)}</loc></url>`)
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  )
}
