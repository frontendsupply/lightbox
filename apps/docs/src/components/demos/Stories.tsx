import * as React from 'react'
import { Lightbox, useLightbox } from '@frontendsupply/lightbox'
import { portraits } from '../../data/photos'

const frameUrl = (id: number, w = 720, h = 1280) => `https://picsum.photos/id/${id}/${w}/${h}.webp`
const idOf = (i: number) => Number(portraits[i]!.src.split('/')[4])

const people = [
  { name: 'Maya', time: '2h', frames: [idOf(0), 60, 73] },
  { name: 'Julian', time: '3h', frames: [idOf(1), 87] },
  { name: 'Noor', time: '5h', frames: [idOf(2), 101, 115, 128] },
  { name: 'Eli', time: '6h', frames: [idOf(3)] },
  { name: 'Sana', time: '8h', frames: [idOf(4), 142, 157] },
  { name: 'Priya', time: '9h', frames: [idOf(5), 170] },
  { name: 'Tomás', time: '12h', frames: [idOf(6), 183, 196] },
  { name: 'Ines', time: '20h', frames: [idOf(7), 211] },
]

// One lightbox item per person; each slide shows that person's current frame.
const items = people.map((person) => ({
  src: frameUrl(person.frames[0]!),
  thumb: frameUrl(person.frames[0]!, 180, 320),
  width: 720,
  height: 1280,
  alt: `${person.name}'s story`,
}))

const chevron = (d: string) => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
)

function StoryChrome({ person, slide, frame, onStep }: { person: (typeof people)[number]; slide: number; frame: number; onStep: (dir: 1 | -1) => void }) {
  const { index, phase } = useLightbox()
  const playing = index === slide && phase === 'open'

  // Warm the cache so the next frame swaps in instantly.
  React.useEffect(() => {
    const next = person.frames[frame + 1]
    if (playing && next) new window.Image().src = frameUrl(next)
  }, [playing, person, frame])

  const side = 'pointer-events-auto absolute top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25 sm:grid'
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center sm:p-3 sm:py-8">
      {/* Same box as the fitted 9:16 image, via container query units on the slide. */}
      <div className="relative aspect-[9/16] w-[min(100cqw,calc(100cqh*9/16))] opacity-(--lightbox-presence)">
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent p-3 pb-12 transition-opacity group-data-dragging:opacity-0 sm:rounded-t-2xl">
          <div className="flex gap-1">
            {person.frames.map((_, f) => (
              <div key={f} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35">
                {f < frame && <div className="h-full bg-white" />}
                {f === frame && playing && (
                  <div
                    key={frame}
                    className="h-full origin-left animate-[story-progress_5s_linear_forwards] bg-white group-active/slide:[animation-play-state:paused] group-data-dragging:[animation-play-state:paused]"
                    onAnimationEnd={() => onStep(1)}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <img src={frameUrl(person.frames[0]!, 64, 64)} alt="" className="size-8 rounded-full object-cover" />
            <span className="font-semibold">{person.name}</span>
            <span className="text-white/60">{person.time}</span>
            <Lightbox.Close className="pointer-events-auto ml-auto grid size-8 place-items-center rounded-full text-white/90 hover:bg-white/10" aria-label="Close">
              {chevron('M18 6 6 18M6 6l12 12')}
            </Lightbox.Close>
          </div>
        </div>
        <button type="button" aria-label="Previous" className={`${side} -left-12`} onClick={() => onStep(-1)}>
          {chevron('m15 18-6-6 6-6')}
        </button>
        <button type="button" aria-label="Next" className={`${side} -right-12`} onClick={() => onStep(1)}>
          {chevron('m9 18 6-6-6-6')}
        </button>
      </div>
    </div>
  )
}

function Viewer({ frames, setFrame }: { frames: number[]; setFrame: (person: number, frame: number) => void }) {
  const { index, goTo, close } = useLightbox()

  // Frames first, then people: past the last frame → next person (cube turn), past the first → previous person.
  const step = (person: number, dir: 1 | -1) => {
    const next = frames[person]! + dir
    if (next < 0) return person > 0 && goTo(person - 1)
    if (next >= people[person]!.frames.length) return person < people.length - 1 ? goTo(person + 1) : close()
    setFrame(person, next)
  }

  return (
    <Lightbox.Portal>
      <Lightbox.Backdrop className="z-50 bg-neutral-950" />
      <Lightbox.Popup
        className="group z-50 text-white outline-none"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
          e.preventDefault() // replaces the default slide navigation
          step(index, e.key === 'ArrowRight' ? 1 : -1)
        }}
      >
        <Lightbox.Viewport>
          {people.map((person, i) => (
            <Lightbox.Slide
              key={person.name}
              index={i}
              className="group/slide [container-type:size] sm:p-3 sm:py-8"
              onTap={(e) => {
                if (e.target !== 'image') return
                e.preventDefault()
                step(i, e.x < 0.3 ? -1 : 1)
              }}
            >
              {/* The cube turn rotates this face, never the slide: snap points come from the slide's box. */}
              <div className="story-face absolute inset-0">
                <Lightbox.Image src={frameUrl(person.frames[frames[i]!]!)} className="sm:rounded-2xl" />
                <StoryChrome person={person} slide={i} frame={frames[i]!} onStep={(dir) => step(i, dir)} />
              </div>
            </Lightbox.Slide>
          ))}
        </Lightbox.Viewport>
      </Lightbox.Popup>
    </Lightbox.Portal>
  )
}

export default function Stories() {
  const [frames, setFrames] = React.useState(() => people.map(() => 0))
  const setFrame = (person: number, frame: number) => setFrames((fs) => fs.map((f, i) => (i === person ? frame : f)))

  return (
    <Lightbox.Root items={items} maxZoom={1} onOpenChange={(open) => open && setFrames(people.map(() => 0))}>
      <div className="flex gap-4 overflow-x-auto px-1 py-2 [scrollbar-width:none]">
        {items.map((item, i) => (
          <div key={item.src} className="flex shrink-0 flex-col items-center gap-1.5">
            <span className="rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2.5px]">
              <Lightbox.Trigger
                index={i}
                className="block size-16 overflow-hidden rounded-full border-[3px] border-white bg-neutral-200 outline-none dark:border-neutral-950 dark:bg-neutral-800"
              >
                <img src={item.thumb} alt={item.alt} className="size-full object-cover" />
              </Lightbox.Trigger>
            </span>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">{people[i]!.name}</span>
          </div>
        ))}
      </div>
      <Viewer frames={frames} setFrame={setFrame} />
    </Lightbox.Root>
  )
}
