# Lightbox — plan

> Native-feeling interactions. Zero opinions about your design.

A headless React lightbox built on **Base UI** (Dialog: focus trap, scroll lock, a11y, portal) and
**Motion** (springs, inertia, interruptible animation). The package ships *behaviour only*: no CSS,
no class names. Styling happens in your app — the docs and recipes use **Tailwind v4 + `cn`**.

## 1. What "native-feeling" means (from the reference videos)

| # | Interaction | Behaviour |
|---|-------------|-----------|
| 1 | **Morph open/close** | The thumbnail grows into the full image. A `object-fit: cover` crop *un-crops* (clip-path inset animates), rounded corners interpolate, `object-fit: contain` cutouts work too. Spring-driven, interruptible (close mid-open just reverses from wherever it is). |
| 2 | **Hidden source slot** | While open, the thumbnail of the *current* item is hidden — it "lifted" into the viewer. |
| 3 | **Page scroll sync** | Navigating inside the viewer scrolls the page behind it so the current item's thumbnail stays in view; the close morph always lands on the right spot. |
| 4 | **Fade fallback** | Items without a visible trigger (e.g. the "+3" overflow) open/close with a fade + slight scale. |
| 5 | **Swipe** | A real `scroll-snap` scroller: touch swipe and trackpad two-finger swipe get the OS's own momentum. Mouse drag-to-swipe on desktop. |
| 6 | **Pinch zoom** | Touch pinch, trackpad pinch (ctrl+wheel, Safari `gesture*`), focal point stays under the fingers, rubber-band past min/max, pinch below fit → close. |
| 7 | **Double-tap / double-click zoom** | Zooms to the tapped point; again → back to fit. |
| 8 | **Pan** | Drag when zoomed, with inertia + rubber-band edges. Wheel pans when zoomed. |
| 9 | **Pull-to-dismiss** | Vertical drag moves + shrinks the image, backdrop fades with distance; release with enough distance/velocity → morph home (velocity carried), else spring back. |
| 10 | **Keyboard** | ←/→ navigate, `+`/`-`/`0` zoom, `Esc` closes (Base UI). Focus returns to the current item's trigger. |
| 11 | **Tap** | Tap backdrop → close. Touch tap on image → toggles `data-ui-hidden` (chrome hide/show). |
| 12 | **Design freedom** | Everything is styled from the outside: data attributes (`data-zoomed`, `data-dragging`, `data-phase`, `data-ui-hidden`…), a `--lightbox-presence` CSS var (0→1) for chrome that should fade with the backdrop, and plain DOM you can target with CSS scroll-driven animations (the "stories cube" demo is pure CSS). |
| 13 | **Reduced motion** | `prefers-reduced-motion` → short fades, no morph. |

## 2. Architecture

```
Lightbox.Root            state: items, index, phase (closed|opening|open|closing), zoomed, dragging
 ├─ Lightbox.Trigger      registers its element per index (many per index allowed), hides itself while active
 └─ Lightbox.Portal       ─┐
     ├─ Lightbox.Backdrop  │ Base UI Dialog parts; opacity bound to `presence`
     └─ Lightbox.Popup    ─┘ full-viewport container, keyboard, data attributes, --lightbox-presence
         ├─ Lightbox.Viewport   horizontal scroll-snap scroller → index; mouse drag-swipe
         │   └─ Lightbox.Slide  snap item (windowed: only index±2 render children)
         │       └─ Lightbox.Image   the morph + zoom target; owns gestures for its slide
         ├─ Lightbox.Close / Prev / Next
         └─ anything you want, via useLightbox()
```

**Phase machine.** Base UI `open` = `phase !== 'closed'`. Every close request (Esc, `Close`, backdrop,
pull, pinch) goes through `close()`, which runs the JS close morph and only then sets `closed`, so Base
UI unmounts after the animation and returns focus.

**One transform, one clip.** Each image is laid out at its fitted rect `F` (contain inside the slide's
content box). Its visual state is `{ img: Rect, clip: Rect, radius, opacity }` in screen space; we convert
that to `translate + scale (origin 0 0)` and `clip-path: inset(... round r)` in local space. Open/close
are `lerp(from, to, p)` with `p` on a spring; `from` is always *captured from the current visual state*
(zoomed, dragged, or mid-morph), which is what makes every animation interruptible and continuous.

**Gestures.** Pointer Events for tracking, a non-passive `touchmove` to claim pinch/vertical drags,
`touch-action: pan-x` on idle slides so the browser owns horizontal swipes (direction lock for free),
`touch-action: none` + `overflow-x: hidden` while zoomed.

**Pure math** (`math.ts`, unit-tested with `node --test`): fit/contain/cover, lerp, intersect,
rubber-band, pan bounds, zoom-about-point, visual→style.

## 3. API sketch

```tsx
<Lightbox.Root items={photos}>
  {photos.map((p, i) => (
    <Lightbox.Trigger key={p.src} index={i}>
      <img src={p.thumb} alt={p.alt} className="aspect-square object-cover" />
    </Lightbox.Trigger>
  ))}
  <Lightbox.Portal>
    <Lightbox.Backdrop className="bg-black" />
    <Lightbox.Popup>
      <Lightbox.Viewport />               {/* renders a Slide + Image per item by default */}
      <Lightbox.Close className="..." />
    </Lightbox.Popup>
  </Lightbox.Portal>
</Lightbox.Root>
```

Root props: `items`, `maxZoom` (4), `wheelToZoom` (false), `closeOnBackdropClick` (true),
`scrollTriggerIntoView` (`'smooth' | 'instant' | false`), `transition` (Motion spring),
`onOpenChange`, `onIndexChange`. `useLightbox()` exposes `index, count, item, items, phase, zoomed,
openAt, close, goTo, next, prev, zoomIn, zoomOut, resetZoom`.

## 4. Repo

```
packages/lightbox   @frontendsupply/lightbox — src/{index.ts, lightbox.tsx, math.ts, math.test.ts}
apps/docs           Astro 7 + React islands + MDX + Tailwind v4 + cn
```
pnpm workspace. Library builds with plain `tsc` (no bundler); docs consume `src` directly.
Peer deps: `react`, `react-dom`, `@base-ui/react`, `motion`.

## 5. Docs site

- **Home** — "Everything a lightbox should do." live grid.
- **Getting started** — install, minimal example, anatomy.
- **API** — every part, props, data attributes, CSS vars, hook.
- **Gestures** — the canonical rules table above.
- **Styling** — data attributes, `--lightbox-presence`, Tailwind recipe built with `cn`.
- **Examples** — Feed (X-style 1–4 grid with "+N"), Listing (hero grid + all photos + thumbnail strip,
  page scroll sync), Stories (round avatars → 9:16 cards, CSS `view-timeline` cube page-turn).

## 6. Milestones

1. Scaffold workspace, math + tests.
2. Core: Root/Trigger/Popup/Viewport/Slide/Image, morph open/close, fade fallback.
3. Gestures: pinch, wheel/trackpad, double-tap, pan + inertia, pull-to-dismiss, mouse drag-swipe, keyboard.
4. Page scroll sync, hidden source slot, focus return, reduced motion.
5. Docs site + demos.
6. Browser verification (desktop + mobile viewport), GitHub repo under `frontendsupply`.

## 7. Later (deliberately not in v0.1)

- Rotate gesture, video slides with scrubbing, loop navigation, RTL, virtualised 10k-item galleries,
  pan-past-edge into the neighbour slide while zoomed (iOS Photos), controlled `index`/`open` props,
  crossfade-between-different-images transition.
