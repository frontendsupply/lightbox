import { Lightbox } from '@frontendsupply/lightbox'
import { landscapes } from '../../data/photos'

const photos = landscapes.slice(0, 6)

export default function Basic() {
  return (
    <Lightbox.Root items={photos}>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <Lightbox.Trigger
            key={photo.src}
            index={i}
            className="overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900"
          >
            <img src={photo.thumb} alt={photo.alt} className="aspect-square size-full object-cover" />
          </Lightbox.Trigger>
        ))}
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className="z-50 bg-black" />
        <Lightbox.Popup className="z-50 outline-none">
          <Lightbox.Viewport />
          <Lightbox.Close
            className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </Lightbox.Close>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  )
}
