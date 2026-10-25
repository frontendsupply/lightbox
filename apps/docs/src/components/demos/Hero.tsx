import { landscapes, portraits } from '../../data/photos'
import { Lightbox, Viewer } from '../lightbox'

const photos = [
  landscapes[0],
  portraits[2],
  landscapes[3],
  landscapes[5],
  portraits[3],
  landscapes[7],
  landscapes[9],
  portraits[4],
  landscapes[11],
  landscapes[12],
  portraits[5],
  landscapes[13],
].map((p, i) => ({ ...p!, caption: p!.alt, i }))
const shown = 9

export default function Hero() {
  return (
    <Lightbox.Root items={photos}>
      <div className="columns-2 gap-2 sm:columns-3">
        {photos.slice(0, shown).map((photo, i) => (
          <Lightbox.Trigger
            key={photo.src}
            index={i}
            className="group relative mb-2 block w-full break-inside-avoid overflow-hidden rounded-xl bg-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-900"
          >
            <img
              src={photo.thumb}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              className="h-auto w-full"
            />
            {i === shown - 1 && (
              <span className="absolute inset-0 grid place-items-center bg-black/45 text-xl font-medium text-white group-data-active:opacity-0">
                +{photos.length - shown}
              </span>
            )}
          </Lightbox.Trigger>
        ))}
      </div>
      <Viewer />
    </Lightbox.Root>
  )
}
