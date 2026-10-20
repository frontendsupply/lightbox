import { defineConfig, fontProviders } from 'astro/config'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  devToolbar: { enabled: false },
  integrations: [react(), mdx()],
  vite: { plugins: [tailwindcss()] },
  markdown: { shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } } },
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
