# Lightbox

> A headless React lightbox and image viewer with pinch zoom, swipe and pull to dismiss. Thumbnails morph into the full photo and back. It ships behaviour only, no CSS.

Lightbox is an open-source library by [Frontend Supply](https://frontend.supply), built on [Base UI](https://base-ui.com) and [Motion](https://motion.dev). It is available under the MIT license.

- Website and live demos: https://lightbox.frontend.supply
- Package: @frontendsupply/lightbox (npm)
- Source: https://github.com/frontendsupply/lightbox
- Docs index for LLMs: https://lightbox.frontend.supply/llms.txt
- Every docs page as Markdown: add .md to its URL, e.g. https://lightbox.frontend.supply/docs/api.md
- A styled, copyable recipe (Tailwind v4): https://lightbox.frontend.supply/docs/styling.md

## What it is for

Lightbox opens a full-screen photo viewer from thumbnails already on the page. The thumbnail grows into the photo, and closing flies it back to the thumbnail it came from. Every gesture follows its platform: touch and trackpad swiping is a native scroll-snap scroller, pinch and double-tap zoom, pull to dismiss.

Use it for:

- Photo grids, feeds and galleries where a thumbnail opens a viewer.
- Product and listing galleries with a hero image, a grid and a "+3" tile.
- Story-style viewers with captions, progress and thumbnails.

It handles the mechanics: morphing, swiping, zoom, dismissal, focus trapping, scroll locking, keyboard shortcuts and keeping the page scrolled to the current thumbnail. Everything visible — backdrop colour, buttons, counters, captions, thumbnails — is your own markup and styles.

## Workflow for coding agents

1. Inspect the project: React 19+ is required. Note its framework, package manager and styling approach (Tailwind, CSS modules, etc.).
2. Install the package and its peers with the project's package manager.
3. Find the existing thumbnail markup. Wrap each thumbnail's `<img>` in a `Lightbox.Trigger` with its index, inside one `Lightbox.Root` that gets the items.
4. Build `items` from the full-size images: `src`, `alt`, and `width`/`height` when known.
5. Render the overlay: `Portal` > `Backdrop` + `Popup` > `Viewport` + `Close`. Style it with the project's own styling. No CSS ships, so the backdrop is invisible until you give it a background.
6. Add only the chrome the user wants (counter, caption, arrows, thumbnail strip) with `useLightbox()` and the data attributes below.
7. Check it: open a photo, swipe, zoom, close, and confirm it lands on the right thumbnail. Run the project's build or typecheck.

## Installation and basic usage

```bash
npm install @frontendsupply/lightbox @base-ui/react motion
```

Use the equivalent pnpm, Yarn or Bun command when that is the project's package manager. Peer dependencies: react and react-dom 19+, @base-ui/react ^1.9, motion 12+.

```tsx
import { Lightbox } from '@frontendsupply/lightbox'

const photos = [
  { src: '/photos/1.jpg', thumb: '/photos/1-thumb.jpg', alt: 'Harbour at dusk', width: 2400, height: 1600 },
  // ...
]

export function Gallery() {
  return (
    <Lightbox.Root items={photos}>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <Lightbox.Trigger key={photo.src} index={i} className="overflow-hidden rounded-lg">
            <img src={photo.thumb} alt={photo.alt} className="aspect-square size-full object-cover" />
          </Lightbox.Trigger>
        ))}
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className="z-50 bg-black" />
        <Lightbox.Popup className="z-50 outline-none">
          <Lightbox.Viewport />
          <Lightbox.Close className="absolute top-4 right-4 text-white" aria-label="Close">×</Lightbox.Close>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  )
}
```

The parts are already marked 'use client'. In the Next.js App Router, put the gallery in a client component when it passes callbacks or calls `useLightbox()`.

## Anatomy

```tsx
<Lightbox.Root items={items}>
  <Lightbox.Trigger index={0} />           {/* as many as you like, several per index is fine */}

  <Lightbox.Portal>
    <Lightbox.Backdrop />
    <Lightbox.Popup>
      <Lightbox.Viewport>                   {/* native scroll-snap scroller */}
        <Lightbox.Slide index={0}>          {/* padding here = breathing room around the image */}
          <Lightbox.Image />                {/* the morph + zoom target */}
        </Lightbox.Slide>
      </Lightbox.Viewport>
      <Lightbox.Close />
      <Lightbox.Prev />
      <Lightbox.Next />
    </Lightbox.Popup>
  </Lightbox.Portal>
</Lightbox.Root>
```

- Root: holds state, renders no element.
- Trigger: a `<button>` that opens the viewer at `index`. Its first `<img>` is the morph source; its box, radius and clipping ancestors define the crop. Use `render={<a href="…" />}` to render it as a link.
- Portal, Backdrop, Popup, Close, Title, Description: Base UI Dialog parts, so focus trapping, scroll locking, Esc and focus return come built in.
- Viewport: the horizontal scroller. With no children it renders `<Slide><Image /></Slide>` for every item. Pass your own slides to add per-slide content.
- Slide: one item per slide, `onTap` for taps on the image or backdrop.
- Image: the morph and zoom target; defaults `src`, `alt`, `srcSet` and `sizes` from the slide's item.
- Prev, Next: buttons that disable themselves at the ends.
- Thumbnails, Thumbnail, ThumbnailIndicator: a thumbnail strip whose indicator follows the swipe frame by frame.

Every part accepts the props of its element plus Base UI's `render` prop.

## Items

```ts
interface LightboxItem {
  src: string
  alt?: string
  width?: number   // with height, the viewer lays out before the image loads
  height?: number
  srcSet?: string
  sizes?: string
}
```

Add any other fields (thumb, caption, author) and read them back typed with `useLightbox<MyItem>()`.

## Root props

- `items`: `LightboxItem[]`, required.
- `maxZoom`: zoom limit relative to the fitted size; default 4, `1` disables zoom.
- `wheelToZoom`: plain wheel zooms instead of panning; default false. Ctrl/⌘ + wheel and pinch always zoom.
- `closeOnBackdropClick`: default true.
- `scrollTriggerIntoView`: `'smooth' | 'instant' | false`; default `'smooth'`. Keeps the current trigger in view behind the viewer.
- `transition`: Motion transition for the open and close morph.
- `onOpenChange(open)`, `onIndexChange(index)`.

## useLightbox()

Call it anywhere inside Root to build your own UI.

```ts
const {
  items, item, index, count,               // data
  phase, open, zoomed, dragging, uiHidden, // state
  progress,                                // MotionValue: fractional index in view
  openAt, close, goTo, next, prev,         // navigation
  zoomIn, zoomOut, resetZoom,              // zoom
} = useLightbox<MyItem>()
```

`progress` updates every frame of a swipe, so dots, progress bars and parallax built with Motion's `useTransform` never re-render.

## Styling

The library only sets the inline styles its mechanics need: the popup and backdrop are fixed full-screen, the viewport is a scroll-snap row, slides are full-width, the image is positioned inside its slide. Style the rest with data attributes:

- `data-phase` on Popup: `opening`, `open`, `closing`.
- `data-zoomed` on Popup and Viewport.
- `data-dragging` on Popup: pull to dismiss in progress.
- `data-ui-hidden` on Popup: the user tapped the image to hide the chrome.
- `data-current` on the Slide in view.
- `data-active` on the Trigger whose item is open (its `<img>` is hidden meanwhile).
- `data-loaded` on Image once the full image has loaded.
- `data-disabled` on Prev and Next at the ends.
- `--lightbox-presence` on Popup and Backdrop: 0 → 1 as the viewer opens, following pull to dismiss and pinch to close.

```tsx
<Lightbox.Popup className="group z-50">
  <Lightbox.Viewport />
  {/* fades with the backdrop, hides while dragging or after a tap on the image */}
  <div className="opacity-(--lightbox-presence) transition-opacity group-data-dragging:opacity-0 group-data-ui-hidden:opacity-0">
    …
  </div>
</Lightbox.Popup>
```

- Slide padding is the image's breathing room: `<Slide className="sm:p-16">` gives desktop margins while phones stay edge to edge.
- `gap` on Viewport spaces the slides while swiping.
- `border-radius` on Image is honoured and morphs from the thumbnail's radius.
- The overlay is portalled to `<body>`; give Backdrop and Popup a z-index above sticky headers.

## Gestures

Built in, nothing to configure: swipe or drag to page, pinch, double-tap and Ctrl/⌘ + wheel to zoom, drag or two-finger scroll up or down to dismiss, pinch below fit to close, tap the image to toggle `data-ui-hidden`, tap the backdrop to close. Keyboard: ← → to navigate, + − 0 to zoom, Esc to close. Reduced motion turns morphs into short fades. Full table: https://lightbox.frontend.supply/docs/gestures.md

## Pitfalls

- Don't transform or animate Slide itself; slides are the scroll-snap targets. Animate a child instead.
- Don't nest buttons or links inside Trigger; it is already a button. Use `render` to change its element.
- Pass `width` and `height` on items when you know them; without them the viewer falls back to the thumbnail's natural size.
- Icon-only Close, Prev and Next buttons need an `aria-label`.
- Keep the thumbnail `<img>` as Trigger's first image; that is what morphs. Its `object-fit`, `object-position` and `border-radius` are read at open and close time.

## Example requests

- Add a lightbox to this photo grid. Style it to match the rest of the app.
- Show a counter and the photo's caption in the viewer, and hide them when the user taps the photo.
- Add a thumbnail strip to the bottom of the viewer.
- Add a "Show all photos" button under the hero grid that opens the viewer at the first photo.

## Further reading

- [Getting started](https://lightbox.frontend.supply/docs.md)
- [Gestures](https://lightbox.frontend.supply/docs/gestures.md)
- [Styling and the styled recipe](https://lightbox.frontend.supply/docs/styling.md)
- [API reference](https://lightbox.frontend.supply/docs/api.md)
- Examples: [chat](https://lightbox.frontend.supply/docs/examples/chat.md), [listing gallery](https://lightbox.frontend.supply/docs/examples/listing.md), [stories](https://lightbox.frontend.supply/docs/examples/stories.md), [product page](https://lightbox.frontend.supply/docs/examples/product.md)
- [Report an issue](https://github.com/frontendsupply/lightbox/issues)
