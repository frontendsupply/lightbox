import * as React from 'react'
import { landscapes } from '../../data/photos'
import { Arrows, Caption, Chrome, Lightbox, Slides, Toolbar } from '../lightbox'

// A road trip down an imaginary coast. x and y are pin positions on the 1200 × 900 map.
const stops = (
  [
    [0, 'Coast road', 560, 120],
    [2, 'Rocky coast', 640, 260],
    [5, 'Sea cliff', 520, 400],
    [4, 'Shoreline', 600, 540],
    [3, 'Road to the sea', 700, 660],
    [6, 'Palm road', 790, 800],
  ] as const
).map(([i, caption, x, y]) => ({ ...landscapes[i]!, caption, x, y }))

const route = `M${stops.map((s) => `${s.x} ${s.y}`).join(' L')}`

export default function TravelMap() {
  const map = React.useRef<HTMLDivElement>(null)
  // Centre a stop in the map. The library's own page sync only scrolls a pin that is off screen; a map should follow.
  const pan = (i: number, behavior: ScrollBehavior = 'smooth') => {
    const el = map.current
    const stop = stops[i]
    if (el && stop) el.scrollTo({ left: stop.x - el.clientWidth / 2, top: stop.y - el.clientHeight / 2, behavior })
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: start on the first stop, once
  React.useEffect(() => pan(0, 'instant'), [])

  return (
    <Lightbox.Root items={stops} onIndexChange={pan} scrollTriggerIntoView={false}>
      <div ref={map} className="h-96 overflow-auto rounded-lg [scrollbar-width:none]">
        <div className="relative h-[900px] w-[1200px]">
          <svg viewBox="0 0 1200 900" className="absolute inset-0" aria-hidden>
            <rect width="1200" height="900" className="fill-sky-200 dark:fill-sky-950" />
            <path
              d="M470 0C440 90 620 130 580 210S470 330 490 420 640 500 570 600 740 720 690 900H1200V0Z"
              className="fill-amber-50 dark:fill-neutral-800"
            />
            <ellipse cx="300" cy="320" rx="70" ry="40" className="fill-amber-50 dark:fill-neutral-800" />
            <ellipse cx="220" cy="660" rx="40" ry="26" className="fill-amber-50 dark:fill-neutral-800" />
            <ellipse cx="930" cy="300" rx="160" ry="110" className="fill-emerald-100 dark:fill-emerald-950" />
            <ellipse cx="1000" cy="680" rx="130" ry="90" className="fill-emerald-100 dark:fill-emerald-950" />
            <path
              d={route}
              fill="none"
              strokeWidth="3"
              strokeDasharray="2 10"
              strokeLinecap="round"
              className="stroke-neutral-500"
            />
          </svg>
          {stops.map((stop, i) => (
            <div
              key={stop.src}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ left: stop.x, top: stop.y }}
            >
              <Lightbox.Trigger
                index={i}
                className="size-14 overflow-hidden rounded-full border-2 border-white bg-white shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <img src={stop.thumb} alt={stop.caption} className="size-full rounded-full object-cover" />
              </Lightbox.Trigger>
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-neutral-900 shadow-sm">
                {stop.caption}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Lightbox.Portal>
        {/* See-through, so the map panning from pin to pin stays visible around the photo. */}
        <Lightbox.Backdrop className="z-50 bg-neutral-950/50" />
        <Lightbox.Popup className="group z-50 text-white outline-none">
          <Slides className="px-4 pt-16 pb-28 sm:px-24 sm:pt-20 sm:pb-32" imageClassName="rounded-2xl shadow-2xl" />
          <Chrome>
            <Toolbar />
            <Arrows />
            <Caption />
          </Chrome>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  )
}
