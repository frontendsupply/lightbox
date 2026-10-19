'use client'
import * as React from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { useRender } from '@base-ui/react/use-render'
import { mergeProps } from '@base-ui/react/merge-props'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
  type MotionValue,
  type Transition,
} from 'motion/react'
import {
  band,
  clamp,
  fit,
  intersect,
  lerp,
  lerpVisual,
  objectPosition,
  panRange,
  rubber,
  scaleRect,
  toStyle,
  zoomAt,
  type Rect,
  type Visual,
} from './math.ts'
import { createPaging, type Scroller } from './paging.ts'

export interface LightboxItem {
  src: string
  alt?: string
  /** Natural width. With `height`, lets the viewer lay out before the image loads. */
  width?: number
  height?: number
  srcSet?: string
  sizes?: string
}

export type LightboxPhase = 'closed' | 'opening' | 'open' | 'closing'

export interface LightboxRootProps<T extends LightboxItem = LightboxItem> {
  items: T[]
  children?: React.ReactNode
  /** Max zoom relative to the fitted size. `1` disables zoom (and makes taps fire instantly). @default 4 */
  maxZoom?: number
  /** Plain mouse wheel zooms instead of panning. Ctrl/⌘ + wheel and trackpad pinch always zoom. @default false */
  wheelToZoom?: boolean
  /** @default true */
  closeOnBackdropClick?: boolean
  /** Keep the current item's trigger in view behind the viewer while navigating. @default 'smooth' */
  scrollTriggerIntoView?: 'smooth' | 'instant' | false
  /** Motion transition for both the open and close morph. Defaults to a light spring in, a critically damped one out. */
  transition?: Transition
  onOpenChange?: (open: boolean) => void
  onIndexChange?: (index: number) => void
}

export interface LightboxTapEvent {
  index: number
  /** The tap landed on the image, or on the empty area around it. */
  target: 'image' | 'backdrop'
  /** Tap position across the image box: 0 → 1 (outside that range for backdrop taps). */
  x: number
  y: number
  pointerType: string
  /** Skip the default action (backdrop → close, touch on the image → toggle `data-ui-hidden`). */
  preventDefault(): void
}

type XY = { x: number; y: number }

interface ImageController {
  animateIn(trigger: HTMLElement | null): void
  animateOut(trigger: HTMLElement | null, velocity?: XY): Promise<void>
  zoomBy(factor: number): void
  resetZoom(): void
}

interface ViewportController {
  goTo(index: number, behavior: ScrollBehavior): void
  /** Stop any scroll in flight and pin the viewport to a slide. */
  freeze(index: number): void
  dragStart(): void
  /** Scrolls by a drag; returns how far past either end the drag wants to go. */
  dragMove(dx: number): number
  dragEnd(vx: number): void
}

interface Ctx {
  items: LightboxItem[]
  index: number
  phase: LightboxPhase
  zoomed: boolean
  dragging: boolean
  uiHidden: boolean
  reducedMotion: boolean
  presence: MotionValue<number>
  /** Fractional index of what's in view: 2.5 is halfway between the third and fourth slide. */
  progress: MotionValue<number>
  options: Required<Pick<LightboxRootProps, 'maxZoom' | 'wheelToZoom' | 'closeOnBackdropClick' | 'scrollTriggerIntoView'>> & {
    open: Transition
    close: Transition
  }
  triggers: Map<number, Set<HTMLElement>>
  images: Map<number, ImageController>
  viewport: React.RefObject<ViewportController | null>
  openTrigger: React.RefObject<HTMLElement | null>
  openAt(index: number, trigger?: HTMLElement | null): void
  close(velocity?: XY): void
  goTo(index: number): void
  pickTrigger(index: number, scroll: ScrollBehavior | false): HTMLElement | null
  hideTrigger(index: number | null): void
  onScrollIndex(index: number): void
  onOpened(): void
  setZoomed(zoomed: boolean): void
  setDragging(dragging: boolean): void
  toggleUi(): void
}

interface SlideCtx {
  index: number
  onTap?: (event: LightboxTapEvent) => void
}

const LightboxContext = React.createContext<Ctx | null>(null)
const SlideContext = React.createContext<SlideCtx | null>(null)

function useCtx() {
  const ctx = React.useContext(LightboxContext)
  if (!ctx) throw new Error('Lightbox parts must be used inside <Lightbox.Root>.')
  return ctx
}

function useSlide() {
  const slide = React.useContext(SlideContext)
  if (!slide) throw new Error('<Lightbox.Image> must be inside <Lightbox.Slide>.')
  return slide
}

/** Stable function identity that always calls the latest closure. */
function useEvent<A extends unknown[], R>(fn: (...args: A) => R) {
  const ref = React.useRef(fn)
  React.useInsertionEffect(() => {
    ref.current = fn
  })
  return React.useCallback((...args: A) => ref.current(...args), [])
}

const SETTLE: Transition = { type: 'spring', stiffness: 420, damping: 42 }
// ζ≈0.87: a hint of overshoot (~0.4%) so opening feels alive.
const OPEN: Transition = { type: 'spring', stiffness: 380, damping: 34 }
// ζ≈1: no undershoot into small targets (avatars), within a pixel of home in ~0.35s.
const CLOSE: Transition = { type: 'spring', stiffness: 520, damping: 46 }
const REDUCED: Transition = { duration: 0.16, ease: 'easeOut' }
// Page turns (wheel, drag release, arrows, thumbnails): ζ≈0.95, no bounce off the snap point.
const GLIDE: Transition = { type: 'spring', stiffness: 320, damping: 34, restDelta: 0.5 }
const SNAP = 'x mandatory'
const OVERLAY: React.CSSProperties = { position: 'fixed', inset: 0 }

/**
 * Lock page scroll without reserving a scrollbar gutter: browsers paint a reserved gutter on top of fixed
 * content, which would leave a strip down the side of a full-screen viewer. Body padding absorbs the
 * scrollbar's width instead, so the page (and every thumbnail on it) stays put. Programmatic scrolling —
 * which the scroll sync relies on — still works under `overflow: hidden`.
 */
function lockScroll() {
  const html = document.documentElement
  const body = document.body
  const gap = innerWidth - html.clientWidth
  const prev = [html.style.overflow, html.style.overscrollBehavior, body.style.paddingRight] as const
  if (gap > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + gap}px`
  html.style.overflow = 'hidden'
  // A sideways trackpad swipe over the chrome would otherwise chain to the page and trigger back/forward.
  html.style.overscrollBehavior = 'none'
  return () => {
    html.style.overflow = prev[0]
    html.style.overscrollBehavior = prev[1]
    body.style.paddingRight = prev[2]
  }
}

const toRect = (r: DOMRect): Rect => ({ x: r.left, y: r.top, w: r.width, h: r.height })
const area = (r: Rect) => r.w * r.h
const thumbImg = (el: HTMLElement) => (el instanceof HTMLImageElement ? el : el.querySelector('img'))

/** The part of `el` actually on screen: clipped by every overflow ancestor and the viewport. */
function visibleRect(el: Element): Rect {
  let r = toRect(el.getBoundingClientRect())
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p)
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') r = intersect(r, toRect(p.getBoundingClientRect()))
  }
  return intersect(r, { x: 0, y: 0, w: innerWidth, h: innerHeight })
}
const visibleFraction = (el: Element) => {
  const full = area(toRect(el.getBoundingClientRect()))
  return full ? area(visibleRect(el)) / full : 0
}

function radiusOf(el: Element, r: DOMRect) {
  const v = getComputedStyle(el).borderTopLeftRadius
  return v.endsWith('%') ? (parseFloat(v) / 100) * Math.min(r.width, r.height) : parseFloat(v) || 0
}

/** Where the full image would sit if drawn into the trigger, cropped like the thumbnail. */
function thumbVisual(trigger: HTMLElement, aspect: number): Visual | null {
  const visible = visibleRect(trigger)
  if (visible.w < 1 || visible.h < 1) return null
  const r = trigger.getBoundingClientRect()
  const img = thumbImg(trigger)
  const ir = img ? img.getBoundingClientRect() : r
  const cs = img ? getComputedStyle(img) : null
  const contain = cs?.objectFit === 'contain' || cs?.objectFit === 'scale-down'
  const [px, py] = cs ? objectPosition(cs.objectPosition) : [0.5, 0.5]
  const drawn = fit(aspect, toRect(ir), contain ? 'contain' : 'cover', px, py)
  const clip = intersect(contain ? drawn : toRect(ir), visible)
  const radius = Math.min(Math.max(radiusOf(trigger, r), img ? radiusOf(img, ir) : 0), clip.w / 2, clip.h / 2)
  return { img: drawn, clip, radius, opacity: 1 }
}

const shift = (r: Rect, dx: number, dy: number): Rect => ({ ...r, x: r.x + dx, y: r.y + dy })
const shiftVisual = (v: Visual, dx: number, dy: number): Visual =>
  dx || dy ? { ...v, img: shift(v.img, dx, dy), clip: shift(v.clip, dx, dy) } : v

const fadeVisual = (v: Visual): Visual => ({ ...v, img: scaleRect(v.img, 0.92), clip: scaleRect(v.clip, 0.92), opacity: 0 })

function Root<T extends LightboxItem>(props: LightboxRootProps<T>) {
  const {
    items,
    children,
    maxZoom = 4,
    wheelToZoom = false,
    closeOnBackdropClick = true,
    scrollTriggerIntoView = 'smooth',
    transition,
    onOpenChange,
    onIndexChange,
  } = props
  const [index, setIndex] = React.useState(0)
  const [phase, setPhase] = React.useState<LightboxPhase>('closed')
  const [zoomed, setZoomed] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const [uiHidden, setUiHidden] = React.useState(false)
  const reducedMotion = useReducedMotion() ?? false
  const presence = useMotionValue(0)
  const progress = useMotionValue(0)
  const [triggers] = React.useState(() => new Map<number, Set<HTMLElement>>())
  const [images] = React.useState(() => new Map<number, ImageController>())
  const viewport = React.useRef<ViewportController | null>(null)
  const openTrigger = React.useRef<HTMLElement | null>(null)
  const hidden = React.useRef<HTMLElement[]>([])
  const live = React.useRef({ index, phase })
  live.current = { index, phase }

  // Hide the thumbnail image (not the whole trigger) so rings, borders and backgrounds stay put.
  const hideTrigger = useEvent((i: number | null) => {
    hidden.current.forEach((el) => (el.style.visibility = ''))
    hidden.current = i === null ? [] : [...(triggers.get(i) ?? [])].map((t) => thumbImg(t) ?? t)
    hidden.current.forEach((el) => (el.style.visibility = 'hidden'))
  })

  const pickTrigger = useEvent((i: number, scroll: ScrollBehavior | false) => {
    const list = [...(triggers.get(i) ?? [])].filter((el) => el.isConnected)
    let best: HTMLElement | null = null
    let seen = 0
    for (const el of list) {
      const v = visibleFraction(el)
      if (v > seen + 0.01) [best, seen] = [el, v]
    }
    const el = best ?? list.find((el) => el === openTrigger.current) ?? list[0] ?? null
    if (el && scroll && seen < 0.99) el.scrollIntoView({ block: seen > 0 ? 'nearest' : 'center', inline: 'nearest', behavior: scroll })
    return el
  })

  const openAt = useEvent((i: number, trigger?: HTMLElement | null) => {
    if (live.current.phase !== 'closed' || !items.length) return
    openTrigger.current = trigger ?? pickTrigger(i, false)
    live.current = { index: clamp(i, 0, items.length - 1), phase: 'opening' }
    progress.set(live.current.index)
    setIndex(live.current.index)
    setUiHidden(false)
    setPhase('opening')
    onOpenChange?.(true)
  })

  const close = useEvent(async (velocity?: XY) => {
    const { phase, index } = live.current
    if (phase === 'closed' || phase === 'closing') return
    live.current = { index, phase: 'closing' }
    setPhase('closing')
    setDragging(false)
    // A swipe or arrow-key glide may still be moving the slides; the morph needs them still.
    viewport.current?.freeze(index)
    const trigger = pickTrigger(index, scrollTriggerIntoView === false ? false : 'instant')
    // An instant scroll also cuts short a smooth page-sync scroll still in flight, so the target holds still.
    if (trigger && scrollTriggerIntoView) trigger.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
    const image = images.get(index)
    const animation = image ? image.animateOut(trigger, velocity) : animate(presence, 0, reducedMotion ? REDUCED : CLOSE)
    // An invisible overlay that never unmounts would block the whole page; never wait forever.
    await Promise.race([animation, new Promise((r) => setTimeout(r, 1500))])
    live.current = { index, phase: 'closed' }
    setPhase('closed')
    setZoomed(false)
    onOpenChange?.(false)
  })

  const goTo = useEvent((i: number) => {
    const target = clamp(i, 0, items.length - 1)
    if (viewport.current) viewport.current.goTo(target, reducedMotion ? 'instant' : 'smooth')
    else setIndex(target)
  })

  const onScrollIndex = useEvent((i: number) => {
    if (i === live.current.index || live.current.phase === 'closing' || live.current.phase === 'closed') return
    live.current = { ...live.current, index: i }
    setIndex(i)
    setZoomed(false)
  })

  const onOpened = useEvent(() => {
    if (live.current.phase !== 'opening') return
    live.current = { ...live.current, phase: 'open' }
    setPhase('open')
  })

  const toggleUi = useEvent(() => setUiHidden((v) => !v))

  // The page behind keeps up: hide the current thumbnail, and once swiping settles, scroll it into view.
  React.useEffect(() => {
    if (phase !== 'open') return
    hideTrigger(index)
    if (!scrollTriggerIntoView) return
    const id = setTimeout(() => {
      const el = pickTrigger(index, false)
      if (el && visibleFraction(el) < 0.99) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: scrollTriggerIntoView })
    }, 150)
    return () => clearTimeout(id)
  }, [index, phase, scrollTriggerIntoView, hideTrigger, pickTrigger])

  React.useLayoutEffect(() => {
    if (phase === 'closed') hideTrigger(null)
  }, [phase, hideTrigger])

  const isOpen = phase !== 'closed'
  React.useLayoutEffect(() => (isOpen ? lockScroll() : undefined), [isOpen])

  const indexChange = useEvent(() => onIndexChange?.(index))
  React.useEffect(() => {
    if (phase !== 'closed') indexChange()
  }, [index, phase, indexChange])

  const ctx: Ctx = {
    items,
    index,
    phase,
    zoomed,
    dragging,
    uiHidden,
    reducedMotion,
    presence,
    progress,
    options: {
      maxZoom,
      wheelToZoom,
      closeOnBackdropClick,
      scrollTriggerIntoView,
      open: reducedMotion ? REDUCED : (transition ?? OPEN),
      close: reducedMotion ? REDUCED : (transition ?? CLOSE),
    },
    triggers,
    images,
    viewport,
    openTrigger,
    openAt,
    close,
    goTo,
    pickTrigger,
    hideTrigger,
    onScrollIndex,
    onOpened,
    setZoomed,
    setDragging,
    toggleUi,
  }

  return (
    // Base UI traps focus, handles Esc and returns focus; we lock scroll ourselves (see lockScroll).
    <Dialog.Root open={phase !== 'closed'} modal="trap-focus" onOpenChange={(open) => !open && close()}>
      <LightboxContext.Provider value={ctx}>{children}</LightboxContext.Provider>
    </Dialog.Root>
  )
}

export interface LightboxTriggerProps extends useRender.ComponentProps<'button'> {
  index: number
}

function Trigger({ index, render, ...props }: LightboxTriggerProps) {
  const ctx = useCtx()
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let set = ctx.triggers.get(index)
    if (!set) ctx.triggers.set(index, (set = new Set()))
    set.add(el)
    return () => void set.delete(el)
  }, [ctx.triggers, index])
  return useRender({
    defaultTagName: 'button',
    render,
    ref,
    state: { active: ctx.phase !== 'closed' && ctx.index === index },
    props: mergeProps<'button'>(
      { type: 'button', 'aria-haspopup': 'dialog', onClick: (e) => ctx.openAt(index, e.currentTarget) },
      props,
    ),
  })
}

/** Writes the 0→1 presence to `--lightbox-presence` (and optionally opacity) every frame. */
function usePresence(ref: React.RefObject<HTMLElement | null>, presence: MotionValue<number>, opacity: boolean) {
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const apply = (v: number) => {
      el.style.setProperty('--lightbox-presence', String(v))
      if (opacity) el.style.opacity = String(v)
    }
    apply(presence.get())
    return presence.on('change', apply)
  }, [ref, presence, opacity])
}

function Backdrop(props: Dialog.Backdrop.Props) {
  const ctx = useCtx()
  const ref = React.useRef<HTMLDivElement>(null)
  usePresence(ref, ctx.presence, true)
  return <Dialog.Backdrop ref={ref} {...mergeProps<'div'>({ style: OVERLAY }, props as never)} />
}

const isEditable = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

function Popup(props: Dialog.Popup.Props) {
  const ctx = useCtx()
  const ref = React.useRef<HTMLDivElement>(null)
  usePresence(ref, ctx.presence, false)

  // Custom slides (no <Lightbox.Image>) still need an open transition.
  React.useLayoutEffect(() => {
    if (ctx.phase !== 'opening' || ctx.images.has(ctx.index)) return
    ctx.presence.set(0)
    animate(ctx.presence, 1, ctx.options.open).then(ctx.onOpened)
  }, [ctx.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // A slide that scrolls away goes inert; don't let focus fall out of the dialog (or scroll the viewport).
  React.useEffect(() => {
    const el = ref.current
    const active = document.activeElement
    if (el && (!active || active === document.body || active.closest('[data-lightbox-slide]:not([data-current])'))) {
      el.focus({ preventScroll: true })
    }
  }, [ctx.index])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.defaultPrevented || isEditable(e.target)) return
    const image = ctx.images.get(ctx.index)
    if (e.key === 'ArrowRight') ctx.goTo(ctx.index + 1)
    else if (e.key === 'ArrowLeft') ctx.goTo(ctx.index - 1)
    else if (e.key === '+' || e.key === '=') image?.zoomBy(1.6)
    else if (e.key === '-') image?.zoomBy(1 / 1.6)
    else if (e.key === '0') image?.resetZoom()
    else return
    e.preventDefault()
  }

  return (
    <Dialog.Popup
      ref={ref}
      aria-label="Image viewer"
      initialFocus={ref}
      finalFocus={() => ctx.pickTrigger(ctx.index, false) ?? true}
      data-phase={ctx.phase}
      data-zoomed={ctx.zoomed ? '' : undefined}
      data-dragging={ctx.dragging ? '' : undefined}
      data-ui-hidden={ctx.uiHidden ? '' : undefined}
      {...mergeProps<'div'>({ style: OVERLAY, onKeyDown }, props as never)}
    />
  )
}

function Viewport({ render, children, ...props }: useRender.ComponentProps<'div'>) {
  const ctx = useCtx()
  const ref = React.useRef<HTMLDivElement>(null)
  const count = ctx.items.length
  const { viewport, onScrollIndex } = ctx

  const { progress, reducedMotion } = ctx
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Fractional (offsetLeft rounds to whole pixels, which left a sub-pixel resnap jerk after glides).
    const stride = () => {
      const [a, b] = el.children as unknown as HTMLElement[]
      return a && b ? b.getBoundingClientRect().left - a.getBoundingClientRect().left : el.clientWidth
    }
    const scroller: Scroller = {
      get left() {
        return el.scrollLeft
      },
      set left(v) {
        el.scrollLeft = v
      },
      get stride() {
        return stride()
      },
      get max() {
        return el.scrollWidth - el.clientWidth
      },
      count,
      // Snapping and CSS smooth scrolling would both fight a position we drive frame by frame.
      snap(on) {
        el.style.scrollSnapType = on ? SNAP : 'none'
        el.style.scrollBehavior = on ? '' : 'auto'
      },
    }
    // Opt-in diagnostics: set window.__LIGHTBOX_TRACE__ = (event) => … to record what paging does.
    const trace = (event: object) => {
      const hook = (globalThis as { __LIGHTBOX_TRACE__?: (e: object) => void }).__LIGHTBOX_TRACE__
      hook?.({ ...event, left: Math.round(el.scrollLeft), t: Math.round(performance.now()) })
    }
    const snap = scroller.snap
    scroller.snap = (on) => {
      trace({ type: 'snap', on })
      snap(on)
    }
    // All the paging logic — wheel, drag, glides, settling — lives in paging.ts, where it is fuzz-tested.
    const paging = createPaging(
      scroller,
      (from, to, velocity, onUpdate, onComplete) => {
        trace({ type: 'glide', from: Math.round(from), to: Math.round(to), velocity: Math.round(velocity) })
        return animate(from, to, { ...GLIDE, velocity, onUpdate, onComplete: () => (trace({ type: 'glide-end' }), onComplete()) })
      },
      (fn, ms) => {
        const id = setTimeout(fn, ms)
        return () => clearTimeout(id)
      },
      () => reducedMotion,
    )
    viewport.current = {
      goTo: (i, behavior) => (trace({ type: 'goTo', i }), paging.goTo(i, behavior === 'instant')),
      freeze: (i) => (trace({ type: 'freeze', i }), paging.freeze(i)),
      dragStart: () => (trace({ type: 'drag-start' }), paging.dragStart()),
      dragMove: paging.dragMove,
      dragEnd: (vx) => (trace({ type: 'drag-end', vx: Math.round(vx) }), paging.dragEnd(vx)),
    }

    const onWheel = (e: WheelEvent) => {
      if (e.defaultPrevented) return // the image zoomed or panned with it
      // Chromium lets only the first event of a scroll sequence be cancelled; one that slips through
      // hands the whole gesture to native scrolling, fighting ours. So every wheel event here is ours.
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) return
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1
      paging.wheel({ dx: e.deltaX * unit, dy: e.deltaY * unit, t: e.timeStamp, discrete: e.deltaMode !== 0 })
      trace({ type: 'wheel', dx: e.deltaX, dy: e.deltaY, deltaMode: e.deltaMode, cancelable: e.cancelable, mode: paging.mode })
    }
    // Touch scrolling stays native; we only make sure nothing is ever left between two slides.
    let scrolled = false
    const onPointerDown = (e: PointerEvent) => {
      scrolled = false
      if (e.pointerType !== 'mouse') paging.pointerDown()
      trace({ type: 'pointerdown', pointerType: e.pointerType, mode: paging.mode })
    }
    // (pointercancel means the browser just started a native pan — scrollend will follow, so no rest() there)
    const onPointerUp = () => !scrolled && paging.rest()
    const onScrollEnd = () => {
      paging.rest()
      trace({ type: 'scrollend', mode: paging.mode })
    }
    const onScroll = () => {
      scrolled = true
      const p = el.scrollLeft / stride()
      progress.set(p)
      onScrollIndex(clamp(Math.round(p), 0, count - 1))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('scrollend', onScrollEnd)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown, true)
    el.addEventListener('pointerup', onPointerUp, true)
    return () => {
      paging.dispose()
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('scrollend', onScrollEnd)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown, true)
      el.removeEventListener('pointerup', onPointerUp, true)
      viewport.current = null
    }
  }, [viewport, onScrollIndex, count, progress, reducedMotion])

  return useRender({
    defaultTagName: 'div',
    render,
    ref,
    state: { zoomed: ctx.zoomed },
    props: mergeProps<'div'>(
      {
        'aria-roledescription': 'carousel',
        style: {
          display: 'flex',
          position: 'relative',
          height: '100%',
          overflowX: ctx.zoomed ? 'hidden' : 'auto',
          overflowY: 'hidden',
          scrollSnapType: SNAP,
          scrollbarWidth: 'none',
          overscrollBehavior: 'contain',
        },
      },
      props,
      {
        children:
          children ??
          ctx.items.map((item, i) => (
            <Slide key={item.src + i} index={i}>
              <Image />
            </Slide>
          )),
      },
    ),
  })
}

export interface LightboxSlideProps extends useRender.ComponentProps<'div'> {
  index: number
  /** Taps on this slide (after the double-tap window when zoom is on). Call `event.preventDefault()` to skip the default. */
  onTap?: (event: LightboxTapEvent) => void
}

function Slide({ index, onTap, render, children, ...props }: LightboxSlideProps) {
  const ctx = useCtx()
  const current = index === ctx.index
  // ponytail: renders index±2 only; a 10k-item gallery would want real virtualisation of the slides too.
  const near = Math.abs(index - ctx.index) <= 2
  const slide = React.useMemo(() => ({ index, onTap }), [index, onTap])
  const element = useRender({
    defaultTagName: 'div',
    render,
    state: { current },
    props: mergeProps<'div'>(
      {
        ...({ 'data-lightbox-slide': '' } as object),
        role: 'group',
        'aria-roledescription': 'slide',
        'aria-label': `${index + 1} of ${ctx.items.length}`,
        'aria-hidden': current ? undefined : true,
        inert: !current,
        style: {
          flex: '0 0 100%',
          position: 'relative',
          overflow: 'clip',
          scrollSnapAlign: 'center',
          scrollSnapStop: 'always',
        },
      },
      props,
      { children: near ? children : null },
    ),
  })
  return <SlideContext.Provider value={slide}>{element}</SlideContext.Provider>
}

export interface LightboxImageProps extends Omit<useRender.ComponentProps<'img'>, 'src'> {
  /** Defaults to the slide's item. */
  src?: string
}

type Gesture =
  | { kind: 'pending' | 'pan' | 'dismiss' | 'swipe'; start: XY; x0: number; y0: number; type: string }
  | { kind: 'pinch'; d0: number; m0: XY; m: XY; s0: number; x0: number; y0: number; wasZoomed: boolean }

const dist = (a: XY, b: XY) => Math.hypot(a.x - b.x, a.y - b.y)
const mid = (a: XY, b: XY) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

function Image({ render, src, alt, srcSet, sizes, ...props }: LightboxImageProps) {
  const ctx = useCtx()
  const slide = useSlide()
  const { index } = slide
  const item = ctx.items[index]
  const imgRef = React.useRef<HTMLImageElement>(null)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  // The slide's own ref isn't attached yet when our layout effects run, so find it from our node.
  const slideEl = () => wrapRef.current!.closest<HTMLDivElement>('[data-lightbox-slide]')!
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const clipPath = useMotionValue('none')
  const opacity = useMotionValue(1)
  const [box, setBox] = React.useState<Rect | null>(null)
  const [aspect, setAspect] = React.useState(item?.width && item.height ? item.width / item.height : 0)
  const [placeholder, setPlaceholder] = React.useState<string | null>(null)
  const [loaded, setLoaded] = React.useState(false)
  const anims = React.useRef<AnimationPlaybackControls[]>([])
  const pending = React.useRef(new Set<() => void>())
  const morph = React.useRef<Visual | null>(null)
  const started = React.useRef(false)

  const F = box && aspect ? fit(aspect, box, 'contain') : null
  const live = React.useRef({ F, ctx, slide })
  live.current = { F, ctx, slide }

  const stop = () => {
    anims.current.forEach((a) => a.stop())
    anims.current = []
  }

  // Measure the slide's content box; borrow the aspect ratio from the thumbnail if we have to.
  React.useLayoutEffect(() => {
    const el = slideEl()
    const measure = () => {
      const cs = getComputedStyle(el)
      const [pl, pt, pr, pb] = [cs.paddingLeft, cs.paddingTop, cs.paddingRight, cs.paddingBottom].map(parseFloat)
      const next = { x: pl, y: pt, w: el.clientWidth - pl - pr, h: el.clientHeight - pt - pb }
      setBox((b) => (b && b.x === next.x && b.y === next.y && b.w === next.w && b.h === next.h ? b : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    el.style.touchAction = 'pan-x'
    const trigger = [...(ctx.triggers.get(index) ?? [])][0]
    const thumb = trigger && thumbImg(trigger)
    if (thumb?.currentSrc) setPlaceholder(thumb.currentSrc)
    if (!aspect && trigger) {
      const r = trigger.getBoundingClientRect()
      setAspect(thumb?.naturalWidth ? thumb.naturalWidth / thumb.naturalHeight : r.height ? r.width / r.height : 1.5)
    }
    if (imgRef.current?.complete && imgRef.current.naturalWidth) onLoad()
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onLoad = () => {
    const img = imgRef.current
    if (!img) return
    setLoaded(true)
    if (!(item?.width && item.height) && img.naturalWidth) setAspect(img.naturalWidth / img.naturalHeight)
  }

  /** Screen rect of the fitted image at rest. */
  const base = (): Rect => {
    const el = slideEl()
    const r = el.getBoundingClientRect()
    const f = live.current.F!
    return { x: r.left + el.clientLeft + f.x, y: r.top + el.clientTop + f.y, w: f.w, h: f.h }
  }
  const radius = () => (imgRef.current ? radiusOf(imgRef.current, imgRef.current.getBoundingClientRect()) : 0)
  const apply = (v: Visual, b: Rect) => {
    const s = toStyle(v, b)
    x.set(s.x)
    y.set(s.y)
    scale.set(s.scale)
    clipPath.set(s.clipPath)
    opacity.set(s.opacity)
    morph.current = v
  }
  const current = (b: Rect): Visual => {
    if (morph.current) return morph.current
    const s = scale.get()
    const img = { x: b.x + x.get(), y: b.y + y.get(), w: b.w * s, h: b.h * s }
    return { img, clip: img, radius: radius(), opacity: opacity.get() }
  }
  const run = (transition: Transition, onUpdate: (p: number) => void, velocity = 0) =>
    new Promise<void>((resolve) => {
      const done = () => {
        pending.current.delete(done)
        resolve()
      }
      pending.current.add(done)
      // 0→1 progress looks "granular" to Motion, which would then idle for ages within a pixel of the end.
      anims.current.push(animate(0, 1, { restDelta: 0.002, restSpeed: 0.02, ...transition, velocity, onUpdate, onComplete: done }))
    })

  const controller: ImageController = {
    animateIn(trigger) {
      stop()
      const { ctx } = live.current
      const r = radius()
      const rest = (b: Rect): Visual => ({ img: b, clip: b, radius: r, opacity: 1 })
      const thumb = !ctx.reducedMotion && trigger ? thumbVisual(trigger, aspect) : null
      const from = thumb ?? fadeVisual(rest(base()))
      apply(from, base())
      ctx.presence.set(0)
      if (thumb) ctx.hideTrigger(index)
      // Endpoints are re-read every frame, so anything still settling underneath can't knock the morph off target.
      run(ctx.options.open, (p) => {
        const b = base()
        apply(lerpVisual(from, rest(b), p), b)
        ctx.presence.set(clamp(p, 0, 1))
      }).then(() => {
        morph.current = null
        clipPath.set('none')
        x.set(0)
        y.set(0)
        scale.set(1)
        ctx.onOpened()
      })
    },
    async animateOut(trigger, velocity) {
      stop()
      const { ctx } = live.current
      if (!live.current.F) return void (await animate(ctx.presence, 0, ctx.options.close))
      const from = current(base())
      const thumb = !ctx.reducedMotion && trigger ? thumbVisual(trigger, aspect) : null
      const to = thumb ?? fadeVisual(from)
      if (thumb) ctx.hideTrigger(index)
      // Follow the thumbnail if the page is still moving (a smooth sync scroll, the user, a layout shift).
      const t0 = trigger?.getBoundingClientRect()
      const target = (): Visual => {
        if (!thumb || !trigger || !t0) return to
        const r = trigger.getBoundingClientRect()
        return shiftVisual(to, r.left - t0.left, r.top - t0.top)
      }
      // Carry the release velocity into the morph so a flick flows straight home.
      const c0 = center(from.img)
      const c1 = center(to.img)
      const d2 = (c1.x - c0.x) ** 2 + (c1.y - c0.y) ** 2
      const pv = velocity && d2 > 1 ? clamp((velocity.x * (c1.x - c0.x) + velocity.y * (c1.y - c0.y)) / d2, 0, 8) : 0
      const p0 = ctx.presence.get()
      await run(
        ctx.options.close,
        (p) => {
          apply(lerpVisual(from, target(), p), base())
          ctx.presence.set(p0 * (1 - clamp(p, 0, 1)))
        },
        pv,
      )
    },
    zoomBy: (f) => zoomTo(scale.get() * f, null),
    resetZoom: () => settle(1, 0, 0),
  }

  React.useLayoutEffect(() => {
    ctx.images.set(index, controller)
    return () => void ctx.images.delete(index)
  })

  // Open morph: this slide is the one being opened.
  React.useLayoutEffect(() => {
    if (ctx.phase !== 'opening' || ctx.index !== index || !F || started.current) return
    started.current = true
    const el = slideEl()
    const scroller = el.parentElement!
    scroller.scrollLeft = el.offsetLeft - (scroller.clientWidth - el.offsetWidth) / 2
    controller.animateIn(ctx.openTrigger.current)
  }, [ctx.phase, F]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- zoom helpers (slide-local coordinates) ----
  const bounds = (s: number) => {
    const el = slideEl()
    const f = live.current.F!
    const [minX, maxX] = panRange(f.x, f.w, s, el.clientWidth)
    const [minY, maxY] = panRange(f.y, f.h, s, el.clientHeight)
    return { minX, maxX, minY, maxY }
  }
  const settle = (s: number, tx: number, ty: number) => {
    if (!live.current.F) return
    const b = bounds(s)
    stop()
    anims.current = [
      animate(scale, s, SETTLE),
      animate(x, clamp(tx, b.minX, b.maxX), SETTLE),
      animate(y, clamp(ty, b.minY, b.maxY), SETTLE),
    ]
  }
  const zoomTo = (target: number, focus: XY | null) => {
    const f = live.current.F
    if (!f) return
    const el = slideEl()
    const p = focus ?? { x: el.clientWidth / 2, y: el.clientHeight / 2 }
    const s0 = scale.get()
    const s1 = clamp(target, 1, live.current.ctx.options.maxZoom)
    settle(s1, zoomAt(f.x, x.get(), s0, s1, p.x), zoomAt(f.y, y.get(), s0, s1, p.y))
  }
  /** Immediate (no spring) zoom used by wheel/trackpad. */
  const zoomNow = (s1: number, p: XY) => {
    const f = live.current.F!
    const s0 = scale.get()
    s1 = clamp(s1, 1, live.current.ctx.options.maxZoom)
    const b = bounds(s1)
    stop()
    x.set(clamp(zoomAt(f.x, x.get(), s0, s1, p.x), b.minX, b.maxX))
    y.set(clamp(zoomAt(f.y, y.get(), s0, s1, p.y), b.minY, b.maxY))
    scale.set(s1)
  }

  // Slides that scroll away reset their zoom (never mid-morph: that would kill the open/close animation).
  React.useEffect(() => {
    if (morph.current || ctx.phase !== 'open') return
    if (ctx.index !== index && (scale.get() !== 1 || x.get() || y.get())) settle(1, 0, 0)
  }, [ctx.index]) // eslint-disable-line react-hooks/exhaustive-deps

  // A resize invalidates pan bounds; start over.
  React.useEffect(() => {
    if (!morph.current) {
      stop()
      x.set(0)
      y.set(0)
      scale.set(1)
    }
  }, [box]) // eslint-disable-line react-hooks/exhaustive-deps

  // Report zoom to the root and hand touch panning to us while zoomed.
  React.useEffect(
    () =>
      scale.on('change', (s) => {
        const { ctx } = live.current
        if (ctx.index !== index || morph.current) return
        const z = s > 1.01
        if (z !== ctx.zoomed) ctx.setZoomed(z)
        const el = wrapRef.current?.closest<HTMLElement>('[data-lightbox-slide]')
        if (el) el.style.touchAction = z ? 'none' : 'pan-x'
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ---- gestures ----
  React.useEffect(() => {
    const el = slideEl()
    const pointers = new Map<number, XY>()
    let g: Gesture | null = null
    let samples: (XY & { t: number })[] = []
    let lastTap: (XY & { t: number }) | null = null
    let tapTimer: ReturnType<typeof setTimeout> | undefined
    let safariScale: number | null = null
    // Gesture coordinates are relative to where the slide was when the gesture began: the slide itself
    // moves during a mouse swipe, and measuring against its live position would feed back into the drag.
    let origin = el.getBoundingClientRect()

    const active = () => {
      const { ctx, F } = live.current
      return ctx.phase === 'open' && ctx.index === index && !!F && !morph.current
    }
    const local = (e: { clientX: number; clientY: number }, r = origin): XY => ({
      x: e.clientX - r.left - el.clientLeft,
      y: e.clientY - r.top - el.clientTop,
    })
    const velocity = (now: number): XY => {
      const recent = samples.filter((s) => now - s.t < 100)
      if (recent.length < 2 || now - recent[recent.length - 1]!.t > 50) return { x: 0, y: 0 }
      const a = recent[0]!
      const b = recent[recent.length - 1]!
      const dt = (b.t - a.t) / 1000 || 1
      return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt }
    }
    const restorePresence = () => anims.current.push(animate(live.current.ctx.presence, 1, SETTLE))
    const reset = () => {
      if (g?.kind === 'dismiss') live.current.ctx.setDragging(false)
      g = null
      pointers.clear()
    }

    const onDown = (e: PointerEvent) => {
      if (!active() || (e.pointerType === 'mouse' && e.button !== 0)) return
      if ((e.target as Element).closest('button, a, input, textarea, select, [data-lightbox-ignore]')) return
      if (!pointers.size) origin = el.getBoundingClientRect()
      const p = local(e)
      pointers.set(e.pointerId, p)
      try {
        el.setPointerCapture(e.pointerId)
      } catch {} // synthetic / already-released pointers
      stop()
      samples = [{ ...p, t: e.timeStamp }]
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()] as [XY, XY]
        const s0 = scale.get()
        g = { kind: 'pinch', d0: dist(a, b) || 1, m0: mid(a, b), m: mid(a, b), s0, x0: x.get(), y0: y.get(), wasZoomed: s0 > 1.01 }
      } else if (pointers.size === 1) g = { kind: 'pending', start: p, x0: x.get(), y0: y.get(), type: e.pointerType }
    }

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId) || !g) return
      const { ctx, F } = live.current
      if (ctx.phase !== 'open' || !F) return reset()
      const p = local(e)
      pointers.set(e.pointerId, p)
      if (g.kind === 'pinch') {
        const [a, b] = [...pointers.values()] as [XY, XY]
        const max = ctx.options.maxZoom
        let s = (g.s0 * dist(a, b)) / g.d0
        s = s > max ? max * (s / max) ** 0.3 : s < 1 ? s ** 0.75 : s
        g.m = mid(a, b)
        x.set(g.m.x - (g.m0.x - (F.x + g.x0)) * (s / g.s0) - F.x)
        y.set(g.m.y - (g.m0.y - (F.y + g.y0)) * (s / g.s0) - F.y)
        scale.set(s)
        if (!g.wasZoomed) ctx.presence.set(clamp((s - 0.5) / 0.5, 0, 1))
        return
      }
      samples.push({ ...p, t: e.timeStamp })
      if (samples.length > 20) samples.shift()
      if (g.kind === 'pending') {
        if (dist(p, g.start) < 6) return
        const adx = Math.abs(p.x - g.start.x)
        const ady = Math.abs(p.y - g.start.y)
        // A mouse swiping slightly diagonally is still swiping; only a clearly vertical drag dismisses.
        const horizontal = g.type === 'mouse' && ctx.items.length > 1 ? ady <= adx * 1.5 : adx > ady
        if (scale.get() > 1.01) g.kind = 'pan'
        else if (!horizontal) {
          g.kind = 'dismiss'
          ctx.setDragging(true)
        } else if (g.type === 'mouse' && ctx.items.length > 1) {
          g.kind = 'swipe'
          g.start = p // past the slop, start following without a jump
          ctx.viewport.current?.dragStart()
        } else return void (g = null) // touch: horizontal belongs to the native scroller
      }
      const dx = p.x - g.start.x
      const dy = p.y - g.start.y
      if (g.kind === 'pan') {
        const b = bounds(scale.get())
        x.set(band(g.x0 + dx, b.minX, b.maxX, el.clientWidth))
        y.set(band(g.y0 + dy, b.minY, b.maxY, el.clientHeight))
      } else if (g.kind === 'dismiss') {
        const H = el.clientHeight
        const k = 1 - clamp(Math.abs(dy) / (H * 0.5), 0, 1) * 0.3
        // shrink around the grab point so it stays under the finger
        x.set(g.start.x + dx - (g.start.x - F.x) * k - F.x)
        y.set(g.start.y + dy - (g.start.y - F.y) * k - F.y)
        scale.set(k)
        ctx.presence.set(1 - clamp(Math.abs(dy) / (H * 0.35), 0, 1))
      } else if (g.kind === 'swipe') {
        // past the first / last slide the image rubber-bands instead of hitting a wall
        const over = ctx.viewport.current?.dragMove(dx) ?? 0
        x.set(-rubber(over, el.clientWidth))
      }
    }

    const onTap = (p: XY, pointerType: string) => {
      const { ctx, F, slide } = live.current
      if (!F) return
      const now = performance.now()
      const canZoom = ctx.options.maxZoom > 1
      clearTimeout(tapTimer)
      if (canZoom && lastTap && now - lastTap.t < 300 && dist(p, lastTap) < 30) {
        lastTap = null
        if (scale.get() > 1.01) return settle(1, 0, 0)
        return zoomTo(Math.max(2, el.clientWidth / F.w, el.clientHeight / F.h), p)
      }
      lastTap = { ...p, t: now }
      const s = scale.get()
      const box = { x: F.x + x.get(), y: F.y + y.get(), w: F.w * s, h: F.h * s }
      const onImage = p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h
      const fire = () => {
        let prevented = false
        slide.onTap?.({
          index,
          target: onImage ? 'image' : 'backdrop',
          x: (p.x - box.x) / box.w,
          y: (p.y - box.y) / box.h,
          pointerType,
          preventDefault: () => (prevented = true),
        })
        if (prevented || live.current.ctx.phase !== 'open') return
        if (!onImage) ctx.options.closeOnBackdropClick && ctx.close()
        else if (pointerType !== 'mouse') ctx.toggleUi()
      }
      // Wait out the double-tap window only when a double tap could mean something.
      if (!canZoom || (pointerType === 'mouse' && !onImage)) fire()
      else tapTimer = setTimeout(fire, 260)
    }

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.delete(e.pointerId)
      const { ctx, F } = live.current
      if (!g || !F) return
      if (ctx.phase !== 'open') return reset()
      const cancelled = e.type === 'pointercancel'
      if (g.kind === 'pinch') {
        if (pointers.size >= 2) return
        const s = scale.get()
        if (!g.wasZoomed && s < 0.85 && !cancelled) ctx.close()
        else {
          const s1 = clamp(s, 1, ctx.options.maxZoom)
          settle(s1, zoomAt(F.x, x.get(), s, s1, g.m.x), zoomAt(F.y, y.get(), s, s1, g.m.y))
          restorePresence()
        }
        g = null // ponytail: the finger left after a pinch is ignored; iOS continues panning with it
        return
      }
      if (pointers.size) return
      const p = local(e)
      const v = cancelled ? { x: 0, y: 0 } : velocity(e.timeStamp)
      const { kind, start } = g
      g = null
      if (kind === 'pending') {
        if (!cancelled) onTap(p, e.pointerType)
      } else if (kind === 'pan') {
        const b = bounds(scale.get())
        const inertia = { type: 'inertia', power: 0.5, timeConstant: 280, bounceStiffness: 360, bounceDamping: 36 } as const
        anims.current = [
          animate(x, x.get(), { ...inertia, velocity: v.x, min: b.minX, max: b.maxX }),
          animate(y, y.get(), { ...inertia, velocity: v.y, min: b.minY, max: b.maxY }),
        ]
      } else if (kind === 'dismiss') {
        ctx.setDragging(false)
        const dy = p.y - start.y
        const projected = dy + v.y * 0.2
        if (!cancelled && Math.abs(projected) > el.clientHeight * 0.15 && Math.sign(projected) === Math.sign(dy)) ctx.close(v)
        else {
          settle(1, 0, 0)
          restorePresence()
        }
      } else if (kind === 'swipe') {
        ctx.viewport.current?.dragEnd(cancelled ? 0 : v.x)
        if (x.get()) anims.current.push(animate(x, 0, SETTLE))
      }
    }

    const onWheel = (e: WheelEvent) => {
      // Never let a pinch reach the browser's page zoom while the viewer is up.
      if (e.ctrlKey) e.preventDefault()
      if (!active()) return
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1
      const dx = e.deltaX * unit
      const dy = e.deltaY * unit
      const s = scale.get()
      const { options } = live.current.ctx
      if (e.ctrlKey || e.metaKey || (options.wheelToZoom && Math.abs(dy) > Math.abs(dx))) {
        e.preventDefault()
        if (safariScale === null) zoomNow(s * Math.exp(-clamp(dy, -50, 50) * (e.ctrlKey ? 0.01 : 0.002)), local(e, el.getBoundingClientRect()))
      } else if (s > 1.01) {
        e.preventDefault()
        stop()
        const b = bounds(s)
        x.set(clamp(x.get() - dx, b.minX, b.maxX))
        y.set(clamp(y.get() - dy, b.minY, b.maxY))
      }
    }

    // Safari: trackpad pinch arrives as GestureEvent (touch pinches are handled by pointers).
    type GestureEvt = UIEvent & { scale: number; clientX: number; clientY: number }
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      if (active() && !pointers.size) safariScale = scale.get()
    }
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      const ge = e as GestureEvt
      if (safariScale !== null && active()) zoomNow(safariScale * ge.scale, local(ge, el.getBoundingClientRect()))
    }
    const onGestureEnd = (e: Event) => {
      e.preventDefault()
      safariScale = null
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1 || (g && g.kind !== 'pending') || scale.get() > 1.01) e.preventDefault()
    }

    const opts = { passive: false } as const
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, opts)
    el.addEventListener('touchmove', onTouchMove, opts)
    el.addEventListener('gesturestart', onGestureStart, opts)
    el.addEventListener('gesturechange', onGestureChange, opts)
    el.addEventListener('gestureend', onGestureEnd, opts)
    return () => {
      clearTimeout(tapTimer)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('gesturestart', onGestureStart)
      el.removeEventListener('gesturechange', onGestureChange)
      el.removeEventListener('gestureend', onGestureEnd)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Unmounting mid-animation must still let the root finish opening/closing.
  React.useEffect(
    () => () => {
      stop()
      pending.current.forEach((done) => done())
    },
    [],
  )

  const fill: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }
  const img = useRender({
    defaultTagName: 'img',
    render,
    ref: imgRef,
    state: { loaded },
    props: mergeProps<'img'>(
      {
        src: src ?? item?.src,
        alt: alt ?? item?.alt ?? '',
        srcSet: srcSet ?? item?.srcSet,
        sizes: sizes ?? item?.sizes,
        draggable: false,
        decoding: 'async',
        onLoad,
        style: fill,
      },
      props,
    ),
  })

  return (
    <motion.div
      ref={wrapRef}
      data-lightbox-image=""
      style={{
        position: 'absolute',
        left: F?.x ?? 0,
        top: F?.y ?? 0,
        width: F?.w ?? 0,
        height: F?.h ?? 0,
        visibility: F ? undefined : 'hidden',
        x,
        y,
        scale,
        originX: 0,
        originY: 0,
        clipPath,
        opacity,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {placeholder && !loaded && <img src={placeholder} alt="" aria-hidden draggable={false} style={fill} />}
      {img}
    </motion.div>
  )
}

const NavButton = ({ step, render, ...props }: useRender.ComponentProps<'button'> & { step: 1 | -1 }) => {
  const ctx = useCtx()
  const target = ctx.index + step
  const disabled = target < 0 || target >= ctx.items.length
  return useRender({
    defaultTagName: 'button',
    render,
    state: { disabled },
    props: mergeProps<'button'>(
      { type: 'button', disabled, 'aria-label': step < 0 ? 'Previous image' : 'Next image', onClick: () => ctx.goTo(target) },
      props,
    ),
  })
}

const Prev = (props: useRender.ComponentProps<'button'>) => <NavButton step={-1} {...props} />
const Next = (props: useRender.ComponentProps<'button'>) => <NavButton step={1} {...props} />

type Box = { x: number; y: number; w: number; h: number }
interface ThumbsCtx {
  register(index: number, el: HTMLElement): () => void
  indicator(el: HTMLElement): () => void
}
const ThumbsContext = React.createContext<ThumbsCtx | null>(null)
function useThumbs() {
  const thumbs = React.useContext(ThumbsContext)
  if (!thumbs) throw new Error('<Lightbox.Thumbnail> and <Lightbox.ThumbnailIndicator> must be inside <Lightbox.Thumbnails>.')
  return thumbs
}

/**
 * A strip of thumbnails. It glides to keep the indicator centred as the viewer moves, and the
 * indicator travels between thumbs with the swipe — position and size — not just on settle.
 */
function Thumbnails({ render, ...props }: useRender.ComponentProps<'div'>) {
  const ctx = useCtx()
  const ref = React.useRef<HTMLDivElement>(null)
  const [api] = React.useState(() => {
    const els = new Map<number, HTMLElement>()
    const boxes = new Map<number, Box>()
    const indicators = new Set<HTMLElement>()
    const measure = (i: number, el: HTMLElement) => boxes.set(i, { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight })
    const remeasure = () => els.forEach((el, i) => measure(i, el))
    let strip: HTMLElement | null = null
    let ro: ResizeObserver | null = null
    const place = (p: number) => {
      const i = Math.floor(p)
      const a = boxes.get(clamp(i, 0, els.size - 1))
      const b = boxes.get(clamp(i + 1, 0, els.size - 1)) ?? a
      if (!a || !b) return
      const t = clamp(p - i, 0, 1)
      const box = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) }
      indicators.forEach((el) => {
        el.style.transform = `translate(${box.x}px, ${box.y}px)`
        el.style.width = `${box.w}px`
        el.style.height = `${box.h}px`
      })
      if (strip) strip.scrollLeft = box.x + box.w / 2 - strip.clientWidth / 2
    }
    return {
      els,
      remeasure,
      place,
      attach(el: HTMLElement) {
        strip = el
        ro = new ResizeObserver(() => {
          remeasure()
          place(ctx.progress.get())
        })
        ro.observe(el)
        els.forEach((t) => ro!.observe(t))
        return () => ro?.disconnect()
      },
      ctx: {
        register(index: number, el: HTMLElement) {
          els.set(index, el)
          measure(index, el)
          ro?.observe(el)
          return () => {
            els.delete(index)
            boxes.delete(index)
            ro?.unobserve(el)
          }
        },
        indicator(el: HTMLElement) {
          indicators.add(el)
          return () => void indicators.delete(el)
        },
      } satisfies ThumbsCtx,
    }
  })

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Thumb offsets are measured against the strip, so it must be positioned (absolute, fixed… all fine).
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
    const detach = api.attach(el)
    api.remeasure()
    api.place(ctx.progress.get())
    const off = ctx.progress.on('change', api.place)
    return () => {
      off()
      detach()
    }
  }, [api, ctx.progress])

  const element = useRender({
    defaultTagName: 'div',
    render,
    ref,
    props: mergeProps<'div'>({ style: { overflowX: 'auto', scrollBehavior: 'auto', scrollbarWidth: 'none' } }, props),
  })
  return <ThumbsContext.Provider value={api.ctx}>{element}</ThumbsContext.Provider>
}

export interface LightboxThumbnailProps extends useRender.ComponentProps<'button'> {
  index: number
}

function Thumbnail({ index, render, ...props }: LightboxThumbnailProps) {
  const ctx = useCtx()
  const thumbs = useThumbs()
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useLayoutEffect(() => (ref.current ? thumbs.register(index, ref.current) : undefined), [thumbs, index])
  const active = ctx.index === index
  return useRender({
    defaultTagName: 'button',
    render,
    ref,
    state: { active },
    props: mergeProps<'button'>(
      { type: 'button', 'aria-label': `Show image ${index + 1}`, 'aria-current': active || undefined, onClick: () => ctx.goTo(index) },
      props,
    ),
  })
}

/** Follows the swipe from thumb to thumb, interpolating position and size. Style it however you like. */
function ThumbnailIndicator({ render, ...props }: useRender.ComponentProps<'div'>) {
  const thumbs = useThumbs()
  const ref = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => (ref.current ? thumbs.indicator(ref.current) : undefined), [thumbs])
  return useRender({
    defaultTagName: 'div',
    render,
    ref,
    props: mergeProps<'div'>({ 'aria-hidden': true, style: { position: 'absolute', left: 0, top: 0, pointerEvents: 'none' } }, props),
  })
}

/** Read lightbox state and drive it from your own UI (counters, captions, thumbnails…). */
export function useLightbox<T extends LightboxItem = LightboxItem>() {
  const ctx = useCtx()
  const image = () => ctx.images.get(ctx.index)
  return {
    items: ctx.items as T[],
    item: ctx.items[ctx.index] as T | undefined,
    index: ctx.index,
    count: ctx.items.length,
    phase: ctx.phase,
    open: ctx.phase !== 'closed',
    zoomed: ctx.zoomed,
    /** MotionValue of the fractional index in view — drive your own indicators and effects with it. */
    progress: ctx.progress,
    dragging: ctx.dragging,
    uiHidden: ctx.uiHidden,
    openAt: ctx.openAt,
    close: () => ctx.close(),
    goTo: ctx.goTo,
    next: () => ctx.goTo(ctx.index + 1),
    prev: () => ctx.goTo(ctx.index - 1),
    zoomIn: () => image()?.zoomBy(1.6),
    zoomOut: () => image()?.zoomBy(1 / 1.6),
    resetZoom: () => image()?.resetZoom(),
  }
}

export const Lightbox = {
  Root,
  Trigger,
  Portal: Dialog.Portal,
  Backdrop,
  Popup,
  Viewport,
  Slide,
  Image,
  Close: Dialog.Close,
  Title: Dialog.Title,
  Description: Dialog.Description,
  Prev,
  Next,
  Thumbnails,
  Thumbnail,
  ThumbnailIndicator,
}
