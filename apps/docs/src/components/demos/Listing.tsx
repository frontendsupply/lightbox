import { cn } from 'cn'
import { Lightbox, useLightbox, Slides, Chrome, Toolbar, Arrows, Thumbnails } from '../lightbox'
import { landscapes } from '../../data/photos'

const photos = landscapes.slice(14, 26).map((p) => ({ ...p, caption: `${p.alt} — The Olive Grove Residence` }))

function ShowAll() {
  const { openAt } = useLightbox()
  return (
    <button
      type="button"
      onClick={() => openAt(0)}
      className="absolute right-3 bottom-3 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm"
    >
      Show all {photos.length} photos
    </button>
  )
}

function CaptionAboveStrip() {
  const { item } = useLightbox<(typeof photos)[number]>()
  return <p className="absolute inset-x-0 bottom-20 text-center text-sm text-white/80">{item?.caption}</p>
}

export default function Listing() {
  return (
    <Lightbox.Root items={photos}>
      <div className="relative grid h-72 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-96">
        {photos.slice(0, 5).map((photo, i) => (
          <Lightbox.Trigger key={photo.src} index={i} className={cn('overflow-hidden bg-neutral-200 dark:bg-neutral-800', i === 0 ? 'col-span-4 row-span-2 sm:col-span-2' : 'hidden sm:block')}>
            <img src={photo.thumb} alt={photo.caption} className="size-full object-cover transition duration-300 hover:brightness-90" />
          </Lightbox.Trigger>
        ))}
        <ShowAll />
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Active</span>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">The Olive Grove Residence</h3>
          <p className="text-sm text-neutral-500">742 Hillcrest Drive, Montecito, CA</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums">$4,250,000</p>
      </div>

      <p className="mt-6 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        The open plan living and dining areas flow onto a stone terrace. Five bedroom suites are spread across two levels, and the
        primary occupies the entire upper wing. Open the gallery, swipe through a few rooms, then close it — the page behind
        scrolled along, so the photo flies back to exactly where it lives.
      </p>

      <h4 className="mt-10 mb-3 font-semibold">All photos</h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <Lightbox.Trigger key={photo.src} index={i} className="overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
            <img src={photo.thumb} alt={photo.caption} className="aspect-[4/3] size-full object-cover" />
          </Lightbox.Trigger>
        ))}
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className="z-50 bg-neutral-950" />
        <Lightbox.Popup className="group z-50 text-white outline-none">
          <Slides className="sm:pb-36" />
          <Chrome>
            <Toolbar />
            <Arrows />
            <CaptionAboveStrip />
            <Thumbnails />
          </Chrome>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  )
}
