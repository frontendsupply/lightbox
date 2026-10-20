import { cn } from 'cn'
import { mixed } from '../../data/photos'
import { Arrows, Chrome, Lightbox, Slides, Thumbnails, Toolbar, useLightbox } from '../lightbox'

const photos = mixed.map((p) => ({ ...p, caption: `${p.alt} — The Olive Grove Residence` }))

function ShowAll() {
  const { openAt } = useLightbox()
  return (
    <button
      type="button"
      onClick={() => openAt(0)}
      className="absolute right-3 bottom-3 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-900 shadow-sm"
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
      <div className="relative grid h-64 grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-xl sm:h-80">
        {photos.slice(0, 5).map((photo, i) => (
          <Lightbox.Trigger
            key={photo.src}
            index={i}
            className={cn(
              'overflow-hidden bg-neutral-200 dark:bg-neutral-800',
              i === 0 ? 'col-span-4 row-span-2 sm:col-span-2' : 'hidden sm:block',
            )}
          >
            <img
              src={photo.thumb}
              alt={photo.caption}
              className="size-full object-cover transition duration-300 hover:brightness-90"
            />
          </Lightbox.Trigger>
        ))}
        <ShowAll />
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-medium">The Olive Grove Residence</h3>
          <p className="text-neutral-500">742 Hillcrest Drive, Montecito, CA</p>
        </div>
        <p className="font-medium tabular-nums">$4,250,000</p>
      </div>

      <p className="mt-4 text-neutral-600 dark:text-neutral-400">
        The open plan living and dining areas flow onto a stone terrace. Five bedroom suites are spread across two
        levels, and the primary occupies the entire upper wing. Open the gallery, swipe through a few rooms, then close
        it — the page behind scrolled along, so the photo flies back to exactly where it lives.
      </p>

      <h4 className="mt-8 mb-3 font-medium">All photos</h4>
      {/* Natural shapes here; the hero grid above crops them — the viewer un-crops either way. */}
      <div className="columns-2 gap-1.5 sm:columns-3">
        {photos.map((photo, i) => (
          <Lightbox.Trigger
            key={photo.src}
            index={i}
            className="mb-1.5 block w-full break-inside-avoid overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900"
          >
            <img
              src={photo.thumb}
              alt={photo.caption}
              width={photo.width}
              height={photo.height}
              className="h-auto w-full"
            />
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
