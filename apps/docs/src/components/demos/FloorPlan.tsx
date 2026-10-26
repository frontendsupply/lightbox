import { cn } from 'cn'
import { mixed } from '../../data/photos'
import { Arrows, Chrome, Lightbox, Slides, Toolbar, useLightbox } from '../lightbox'

// A 6 × 4 grid; the order is the swipe order, so neighbours in the viewer are neighbours on the plan.
const rooms = (
  [
    ['Living room', 'living-room', 'col-span-3 row-span-2'],
    ['Kitchen', 'kitchen', 'col-span-3'],
    ['Dining', 'dining-room', 'col-span-3'],
    ['Terrace', 'pool', 'col-start-5 row-start-3 col-span-2 row-span-2'],
    ['Study', 'armchair', 'col-start-4 row-start-3 row-span-2'],
    ['Bath', 'bathroom', 'col-start-3 row-start-3 row-span-2'],
    ['Bedroom', 'bedroom', 'col-start-1 row-start-3 col-span-2 row-span-2'],
  ] as const
).map(([caption, name, area]) => ({ ...mixed.find((p) => p.src === `/photos/${name}.webp`)!, caption, area }))

const plan = 'grid grid-cols-6 grid-rows-4'

/** The plan in the viewer: a thumbnail strip laid out as the house. The indicator glides from room to room. */
function MiniPlan() {
  const { item } = useLightbox<(typeof rooms)[number]>()
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <p className="text-sm font-medium">{item?.caption}</p>
      <Lightbox.Thumbnails className={cn(plan, 'h-24 w-36 gap-0.5 rounded-md bg-white/25 p-0.5')}>
        {rooms.map((room, i) => (
          <Lightbox.Thumbnail
            key={room.src}
            index={i}
            aria-label={room.caption}
            className={cn('rounded-[2px] bg-neutral-800 outline-none hover:bg-neutral-700', room.area)}
          />
        ))}
        <Lightbox.ThumbnailIndicator className="rounded-[2px] bg-amber-300" />
      </Lightbox.Thumbnails>
    </div>
  )
}

export default function FloorPlan() {
  return (
    <Lightbox.Root items={rooms}>
      {/* The gaps are the walls. */}
      <div className={cn(plan, 'h-80 gap-1 overflow-hidden rounded-xl border-4 border-neutral-800 bg-neutral-800')}>
        {rooms.map((room, i) => (
          <Lightbox.Trigger
            key={room.src}
            index={i}
            className={cn(
              'group relative overflow-hidden bg-amber-300 outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-inset',
              room.area,
            )}
          >
            <img src={room.thumb} alt={room.caption} className="size-full object-cover" />
            <span className="absolute top-1.5 left-1.5 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-neutral-900 group-data-active:bg-transparent">
              {room.caption}
            </span>
          </Lightbox.Trigger>
        ))}
      </div>
      <Lightbox.Portal>
        <Lightbox.Backdrop className="z-50 bg-neutral-950" />
        <Lightbox.Popup className="group z-50 text-white outline-none">
          <Slides className="pb-40 sm:pb-40" />
          <Chrome>
            <Toolbar />
            <Arrows />
            <MiniPlan />
          </Chrome>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  )
}
