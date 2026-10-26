import { cn } from 'cn'
import * as React from 'react'
import { Chrome, Lightbox, Slides } from '../lightbox'

// A product series by Mojtaba Fahiminia on Unsplash, 3200px on the long side so a 4× zoom stays sharp.
const shot = (name: string, width: number, height: number, alt: string) => ({
  src: `/photos/${name}.webp`,
  thumb: `/photos/${name}-thumb.webp`,
  width,
  height,
  alt,
})
const photos = [
  shot('sneaker-balance', 2286, 3200, 'The sneaker balanced on two stones'),
  shot('sneaker-pair', 2286, 3200, 'The pair, one standing on its heel'),
  shot('sneaker-side', 3200, 2286, 'Side view: suede toe, leather upper'),
  shot('sneaker-stones', 2286, 3200, 'The pair on stones with a dry branch'),
]
const sizes = [39, 40, 41, 42, 43, 44, 45]

export default function Product() {
  const [selected, setSelected] = React.useState(0)
  const [size, setSize] = React.useState(42)
  return (
    // Following the viewer's index means closing flies the photo back into the main image, whichever one you're on.
    <Lightbox.Root items={photos} onIndexChange={setSelected} wheelToZoom>
      <div className="grid gap-5 sm:grid-cols-[1fr_11rem]">
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <div className="flex gap-2 sm:flex-col">
            {photos.map((photo, i) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => setSelected(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === selected}
                className={cn(
                  'size-12 shrink-0 overflow-hidden rounded-lg outline-offset-2 transition',
                  i === selected ? 'outline-2 outline-neutral-900 dark:outline-white' : 'opacity-60 hover:opacity-100',
                )}
              >
                <img src={photo.thumb} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
          <Lightbox.Trigger
            index={selected}
            className="group relative flex-1 cursor-zoom-in overflow-hidden rounded-xl bg-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-900"
          >
            <img src={photos[selected]!.thumb} alt={photos[selected]!.alt} className="aspect-4/5 w-full object-cover" />
          </Lightbox.Trigger>
        </div>

        <div className="flex flex-col">
          <h3 className="text-base font-medium">Field Sneaker</h3>
          <p className="text-neutral-500">Suede and leather · Sand / Tangerine</p>
          <p className="mt-2 font-medium tabular-nums">$128</p>
          <p className="mt-5 mb-2 text-xs text-neutral-500">Size (EU)</p>
          <div className="grid grid-cols-4 gap-1.5">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={s === size}
                className={cn(
                  'rounded-md border py-1.5 tabular-nums transition',
                  s === size
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                    : 'border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600',
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-4 rounded-full bg-neutral-900 py-2.5 font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Add to bag
          </button>
        </div>
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className="z-50 bg-white/10 backdrop-blur-sm dark:bg-neutral-950/70" />
        <Lightbox.Popup className="group z-50 text-neutral-900 outline-none dark:text-white">
          <Slides className="sm:pb-32" />
          <Chrome>
            <Lightbox.Close
              aria-label="Close"
              className="pointer-events-auto absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-neutral-900/5 outline-none hover:bg-neutral-900/10 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-white/10 dark:hover:bg-white/20"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Lightbox.Close>
            <p className="absolute inset-x-0 bottom-22 text-center text-xs transition-opacity group-data-zoomed:opacity-0">
              <span className="pointer-coarse:hidden">Scroll or double-click to zoom</span>
              <span className="hidden pointer-coarse:inline">Pinch or double-tap to zoom</span>
            </p>
            <Lightbox.Thumbnails className="pointer-events-auto absolute inset-x-0 bottom-0 flex gap-2 px-[50%] pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {photos.map((photo, i) => (
                <Lightbox.Thumbnail
                  key={photo.src}
                  index={i}
                  className="size-12 shrink-0 overflow-hidden rounded-lg opacity-50 transition-opacity outline-none hover:opacity-80 data-active:opacity-100"
                >
                  <img src={photo.thumb} alt="" className="size-full object-cover" draggable={false} />
                </Lightbox.Thumbnail>
              ))}
              <Lightbox.ThumbnailIndicator className="rounded-lg outline-2 outline-offset-2 outline-neutral-900 dark:outline-white" />
            </Lightbox.Thumbnails>
          </Chrome>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  )
}
