# Lightbox

> Native gestures out of the box. The design is entirely up to you.

A headless React image viewer built on [Base UI](https://base-ui.com) and [Motion](https://motion.dev). It ships behaviour
only — no CSS — so it looks like your product, not like a plugin.

- **Morph open/close** that un-crops `object-fit: cover` thumbnails and interpolates corner radius
- **Native swiping** — a real `scroll-snap` scroller, so touch and trackpad momentum come from the OS; mouse dragging
  comes from [Blossom Carousel](https://www.blossom-carousel.com), loaded only where there's a mouse
- **Pinch, trackpad, wheel, double-tap and keyboard zoom**, with rubber-banding and inertial panning
- **Pull to dismiss** with velocity carried into the close animation; pinch below fit to close
- **Page scroll sync** — the page behind the viewer follows along, so closing lands on the right thumbnail
- **Accessible** — focus trap, scroll lock, `Esc`, focus return (Base UI Dialog), reduced-motion fallback

```bash
pnpm add @frontendsupply/lightbox @base-ui/react motion
```

```tsx
import { Lightbox } from '@frontendsupply/lightbox'

<Lightbox.Root items={photos}>
  {photos.map((photo, i) => (
    <Lightbox.Trigger key={photo.src} index={i}>
      <img src={photo.thumb} alt={photo.alt} className="aspect-square object-cover" />
    </Lightbox.Trigger>
  ))}
  <Lightbox.Portal>
    <Lightbox.Backdrop className="bg-black" />
    <Lightbox.Popup>
      <Lightbox.Viewport />
      <Lightbox.Close>Close</Lightbox.Close>
    </Lightbox.Popup>
  </Lightbox.Portal>
</Lightbox.Root>
```

## Repo

| Path | |
| --- | --- |
| [`packages/lightbox`](packages/lightbox) | The library (`@frontendsupply/lightbox`) |
| [`apps/docs`](apps/docs) | Docs site — Astro, MDX, Tailwind v4, `cn` |

```bash
pnpm install
pnpm dev        # docs at localhost:4321
pnpm test       # geometry unit tests
pnpm typecheck
pnpm build
```

## License

MIT
