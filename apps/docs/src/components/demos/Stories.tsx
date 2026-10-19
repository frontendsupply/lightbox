import { Lightbox, useLightbox } from '@frontendsupply/lightbox'
import { portraits } from '../../data/photos'

const names = ['Maya', 'Julian', 'Noor', 'Eli', 'Sana', 'Priya', 'Tomás', 'Ines']
const stories = portraits.slice(0, 8).map((p, i) => {
  const id = p.src.split('/')[4]
  return {
    src: `https://picsum.photos/id/${id}/720/1280.webp`,
    thumb: `https://picsum.photos/id/${id}/180/320.webp`,
    width: 720,
    height: 1280,
    alt: `${names[i]}'s story`,
    name: names[i]!,
    time: `${i + 1}h`,
  }
})

function StoryChrome({ index }: { index: number }) {
  const { index: current, next, close, count } = useLightbox()
  const story = stories[index]!
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center sm:p-3 sm:py-8">
      {/* Same box as the fitted 9:16 image, via container query units on the slide. */}
      <div className="relative aspect-[9/16] w-[min(100cqw,calc(100cqh*9/16))] opacity-(--lightbox-presence)">
        <div className="absolute inset-x-0 top-0 sm:rounded-t-2xl bg-gradient-to-b from-black/50 to-transparent p-3 pb-10 transition-opacity group-data-dragging:opacity-0">
          <div className="h-0.5 overflow-hidden rounded-full bg-white/30">
            {index === current && (
              <div
                className="h-full origin-left animate-[story-progress_6s_linear_forwards] bg-white group-data-dragging:[animation-play-state:paused]"
                onAnimationEnd={() => (index < count - 1 ? next() : close())}
              />
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <img src={story.thumb} alt="" className="size-8 rounded-full object-cover" />
            <span className="font-semibold">{story.name}</span>
            <span className="text-white/60">{story.time}</span>
            <Lightbox.Close className="pointer-events-auto ml-auto grid size-8 place-items-center rounded-full text-white/90 hover:bg-white/10" aria-label="Close">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Lightbox.Close>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Stories() {
  return (
    <Lightbox.Root items={stories} maxZoom={1}>
      <div className="flex gap-4 overflow-x-auto px-1 py-2 [scrollbar-width:none]">
        {stories.map((story, i) => (
          <div key={story.src} className="flex shrink-0 flex-col items-center gap-1.5">
            <span className="rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2.5px]">
              <Lightbox.Trigger index={i} className="block size-16 overflow-hidden rounded-full border-[3px] border-white outline-none dark:border-neutral-950">
                <img src={story.thumb} alt={story.alt} className="size-full object-cover" />
              </Lightbox.Trigger>
            </span>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">{story.name}</span>
          </div>
        ))}
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className="z-50 bg-neutral-950" />
        <Lightbox.Popup className="group z-50 text-white outline-none">
          <Lightbox.Viewport>
            {stories.map((story, i) => (
              <Lightbox.Slide key={story.src} index={i} className="story-slide [container-type:size] sm:p-3 sm:py-8">
                <Lightbox.Image className="sm:rounded-2xl" />
                <StoryChrome index={i} />
              </Lightbox.Slide>
            ))}
          </Lightbox.Viewport>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  )
}
