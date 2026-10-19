import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  devToolbar: { enabled: false },
  integrations: [react(), mdx()],
  vite: { plugins: [tailwindcss()] },
  markdown: { shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } } },
})
