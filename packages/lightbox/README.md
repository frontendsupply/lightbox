# Lightbox

A headless React lightbox and image viewer with pinch zoom, swipe and pull to dismiss. Thumbnails morph into the full
photo and back. Built on [Base UI](https://base-ui.com) and [Motion](https://motion.dev), it ships behavior only, no
CSS, so the gallery looks like your product, not like a plugin.

**[Docs and live demos](https://lightbox.frontend.supply)** · Made by [Frontend Supply](https://frontend.supply)

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

Requires React 19 or later. Read [Getting started](https://lightbox.frontend.supply/docs) for the full setup.

## Features

- **Morph open and close** that un-crops `object-fit: cover` thumbnails and interpolates corner radius
- **Native swiping**: a real `scroll-snap` scroller, so touch and trackpad momentum come from the OS. Mouse dragging
  comes from [Blossom Carousel](https://www.blossom-carousel.com), loaded only where there's a mouse
- **Pinch, trackpad, wheel, double-tap and keyboard zoom**, with rubber-banding and inertial panning
- **Pull to dismiss** with velocity carried into the close animation. Pinch below fit to close
- **Page scroll sync**: the page behind the viewer follows along, so closing lands on the right thumbnail
- **Accessible**: focus trap, scroll lock, `Esc`, focus return (Base UI Dialog) and a reduced-motion fallback
- **Headless**: style every part with Tailwind, CSS modules or anything else, through data attributes and a CSS variable

## Docs

- [Getting started](https://lightbox.frontend.supply/docs)
- [Gestures](https://lightbox.frontend.supply/docs/gestures)
- [Styling](https://lightbox.frontend.supply/docs/styling)
- [API reference](https://lightbox.frontend.supply/docs/api)
- Examples: [feed](https://lightbox.frontend.supply/docs/examples/feed),
  [listing gallery](https://lightbox.frontend.supply/docs/examples/listing),
  [stories](https://lightbox.frontend.supply/docs/examples/stories)

## License

MIT. Made by [Frontend Supply](https://frontend.supply).
