import { satteri } from '@astrojs/markdown-satteri'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, fontProviders } from 'astro/config'

/** Open external links in markdown in a new tab. */
const externalLinks = {
  name: 'external-links',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      if (!/^https?:/.test(node.properties?.href)) return
      ctx.setProperty(node, 'target', '_blank')
      ctx.setProperty(node, 'rel', 'noreferrer')
    },
  },
}

export default defineConfig({
  devToolbar: { enabled: false },
  integrations: [react(), mdx()],
  vite: { plugins: [tailwindcss()] },
  markdown: {
    processor: satteri({ hastPlugins: [externalLinks] }),
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Geist',
      cssVariable: '--font-geist',
      options: {
        variants: [{ src: ['./src/assets/fonts/Geist.woff2'], weight: '100 900', style: 'normal' }],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Paper Mono',
      cssVariable: '--font-paper-mono',
      fallbacks: ['monospace'],
      options: {
        variants: [{ src: ['./src/assets/fonts/PaperMono.woff2'], weight: 400, style: 'normal' }],
      },
    },
  ],
})
