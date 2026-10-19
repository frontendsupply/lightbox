/**
 * A styled viewer recipe: the headless @frontendsupply/lightbox parts + Tailwind v4 + cn.
 * Copy this file into your app and make it yours — nothing here is part of the library.
 */
import * as React from 'react'
import { cn } from 'cn'
import { Lightbox, useLightbox, type LightboxItem } from '@frontendsupply/lightbox'

export { Lightbox, useLightbox }

const iconButton =
  'pointer-events-auto grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition outline-none hover:bg-white/20 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-0'

const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cn('size-5', className)} aria-hidden>
    <path d={d} />
  </svg>
)
const icons = {
  close: 'M18 6 6 18M6 6l12 12',
  prev: 'm15 18-6-6 6-6',
  next: 'm9 18 6-6-6-6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
}

/** Fades with the backdrop (`--lightbox-presence`) and hides while dragging or after a tap. */
export function Chrome({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-(--lightbox-presence)">
      <div className={cn('absolute inset-0 transition-opacity duration-200 group-data-dragging:opacity-0 group-data-ui-hidden:opacity-0', className)}>
        {children}
      </div>
    </div>
  )
}

export function Toolbar({ zoom = true }: { zoom?: boolean }) {
  const { index, count, zoomed, zoomIn, zoomOut } = useLightbox()
  return (
    <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <span className="rounded-full bg-black/30 px-3 py-1.5 text-sm tabular-nums backdrop-blur-md">
        {index + 1} / {count}
      </span>
      <div className="flex gap-2">
        {zoom && (
          <>
            <button type="button" className={cn(iconButton, 'pointer-coarse:hidden')} onClick={zoomOut} disabled={!zoomed} aria-label="Zoom out">
              <Icon d={icons.minus} />
            </button>
            <button type="button" className={cn(iconButton, 'pointer-coarse:hidden')} onClick={zoomIn} aria-label="Zoom in">
              <Icon d={icons.plus} />
            </button>
          </>
        )}
        <Lightbox.Close className={iconButton} aria-label="Close">
          <Icon d={icons.close} />
        </Lightbox.Close>
      </div>
    </div>
  )
}

export function Arrows() {
  const button = cn(iconButton, 'absolute top-1/2 -translate-y-1/2 pointer-coarse:hidden')
  return (
    <>
      <Lightbox.Prev className={cn(button, 'left-3')}>
        <Icon d={icons.prev} />
      </Lightbox.Prev>
      <Lightbox.Next className={cn(button, 'right-3')}>
        <Icon d={icons.next} />
      </Lightbox.Next>
    </>
  )
}

export function Caption({ className }: { className?: string }) {
  const { item, index, count } = useLightbox<LightboxItem & { caption?: string }>()
  return (
    <div className={cn('absolute inset-x-0 bottom-0 px-4 pt-10 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center', className)}>
      <p className="text-sm font-medium">{item?.caption ?? item?.alt}</p>
      <p className="mt-0.5 text-xs text-white/50 tabular-nums">
        {index + 1} of {count}
      </p>
    </div>
  )
}

export function Thumbnails() {
  const { items, index, goTo } = useLightbox<LightboxItem & { thumb?: string }>()
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    ref.current?.children[index]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [index])
  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute inset-x-0 bottom-0 flex gap-1.5 overflow-x-auto px-[50%] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [scrollbar-width:none]"
    >
      {items.map((item, i) => (
        <button
          key={item.src}
          type="button"
          aria-label={`Show image ${i + 1}`}
          aria-current={i === index}
          onClick={() => goTo(i)}
          className={cn(
            'h-12 w-9 shrink-0 overflow-hidden rounded-md opacity-40 transition-all duration-300 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white',
            i === index && 'w-16 opacity-100',
          )}
        >
          <img src={item.thumb ?? item.src} alt="" className="size-full object-cover" draggable={false} />
        </button>
      ))}
    </div>
  )
}

export function Slides({ className, imageClassName }: { className?: string; imageClassName?: string }) {
  const { items } = useLightbox()
  return (
    <Lightbox.Viewport className="gap-6">
      {items.map((item, i) => (
        <Lightbox.Slide key={item.src} index={i} className={cn('sm:px-16 sm:pt-16 sm:pb-24', className)}>
          <Lightbox.Image className={imageClassName} />
        </Lightbox.Slide>
      ))}
    </Lightbox.Viewport>
  )
}

/** The whole overlay. Put it anywhere inside <Lightbox.Root>. */
export function Viewer({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <Lightbox.Portal>
      <Lightbox.Backdrop className="z-50 bg-neutral-950" />
      <Lightbox.Popup className={cn('group z-50 text-white outline-none', className)}>
        {children ?? (
          <>
            <Slides />
            <Chrome>
              <Toolbar />
              <Arrows />
              <Caption />
            </Chrome>
          </>
        )}
      </Lightbox.Popup>
    </Lightbox.Portal>
  )
}
