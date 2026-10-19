import { Lightbox } from '@frontendsupply/lightbox'
import { landscapes } from '../../data/photos'

const photos = landscapes.slice(0, 6)

export default function Basic() {
  return (
    <Lightbox.Root items={photos}>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <Lightbox.Trigger key={photo.src} index={i} className="overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
            <img src={photo.thumb} alt={photo.alt} className="aspect-square size-full object-cover" />
          </Lightbox.Trigger>
        ))}
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className="z-50 bg-black" />
        <Lightbox.Popup className="z-50 outline-none">
          <Lightbox.Viewport />
          <Lightbox.Close className="absolute top-4 right-4 rounded-full bg-white/15 px-4 py-1.5 text-sm text-white backdrop-blur">
            Close
          </Lightbox.Close>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  )
}
