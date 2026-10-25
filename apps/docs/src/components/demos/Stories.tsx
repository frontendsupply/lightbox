import { Lightbox, useLightbox } from '@frontendsupply/lightbox'
import * as React from 'react'

// 720×1280 photos from Unsplash; videos and their sound from Pixabay. A video's poster is the .webp of the same name.
const media = (file: string) => `/stories/${file}`
const isVideo = (file: string) => file.endsWith('.mp4')
const still = (file: string) => media(file.replace('.mp4', '.webp'))

const people = [
  { name: 'Maya', time: '2h', frames: ['ocean.mp4', 'aurora.webp', 'coffee.webp'] },
  { name: 'Julian', time: '3h', frames: ['waterfall.mp4', 'lavender.webp', 'barista.mp4'] },
  { name: 'Noor', time: '5h', frames: ['leaves.mp4', 'books.webp', 'rain.mp4', 'flowers.webp'] },
  { name: 'Eli', time: '6h', frames: ['snow.mp4', 'peak.webp'] },
  { name: 'Sana', time: '8h', frames: ['wave.webp', 'jellyfish.mp4', 'food.webp', 'concert.webp'] },
  { name: 'Priya', time: '9h', frames: ['sakura.mp4', 'dog.webp'] },
  { name: 'Tomás', time: '12h', frames: ['canyon.webp', 'campfire.mp4', 'mountains.webp'] },
  { name: 'Ines', time: '20h', frames: ['sunflower.webp', 'city.mp4', 'tokyo.webp', 'fireworks.mp4'] },
]

// One lightbox item per person; each slide shows that person's current frame.
const items = people.map((person) => ({
  src: media(person.frames[0]!),
  thumb: media(person.frames[0]!.replace(/\.\w+$/, '-thumb.webp')),
  width: 720,
  height: 1280,
  alt: `${person.name}'s story`,
}))

const SPEAKER = 'M11 5 6 9H2v6h4l5 4z'
const icon = (d: string) => (
  <svg
    viewBox="0 0 24 24"
    className="size-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={d} />
  </svg>
)

/** One person's current frame (a photo, or a video with sound) and the chrome over it. */
function Story({
  person,
  slide,
  frame,
  muted,
  onMute,
  onDone,
}: {
  person: (typeof people)[number]
  slide: number
  frame: number
  muted: boolean
  onMute: (muted: boolean) => void
  onDone: () => void
}) {
  const { index, phase, dragging } = useLightbox()
  const playing = index === slide && phase === 'open'
  const file = person.frames[frame]!
  const video = React.useRef<HTMLVideoElement>(null)
  const bar = React.useRef<HTMLDivElement>(null)
  const [held, setHeld] = React.useState(false)

  // Warm the cache so the next frame (or video poster) swaps in instantly.
  React.useEffect(() => {
    const next = person.frames[frame + 1]
    if (playing && next) new window.Image().src = still(next)
  }, [playing, person, frame])

  // A hold ends wherever the pointer lifts: the slide captures it on the way down.
  React.useEffect(() => {
    if (!held) return
    const release = new AbortController()
    for (const type of ['pointerup', 'pointercancel'])
      addEventListener(type, () => setHeld(false), { signal: release.signal })
    return () => release.abort()
  }, [held])

  // Videos start over whenever their card comes up and pause on a hold or a drag, like the photo timer.
  React.useEffect(() => {
    if (playing && video.current) video.current.currentTime = 0
  }, [playing])
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new frame may mount a new <video>; unmuting retries play()
  React.useEffect(() => {
    const v = video.current
    if (!v) return
    if (!playing || held || dragging) return v.pause()
    // Sound can be refused without a fresh tap (iOS asks per video): carry on muted.
    v.play().catch((e) => e.name === 'NotAllowedError' && onMute(true))
  }, [playing, held, dragging, muted, file])

  // A video's bar follows its clock; a photo's is a 5s CSS animation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new frame may mount a new <video>
  React.useEffect(() => {
    const v = video.current
    if (!v || !playing) return
    let raf = requestAnimationFrame(function tick() {
      bar.current?.style.setProperty('transform', `scaleX(${v.currentTime / v.duration || 0})`)
      raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [playing, file])

  const round = 'grid size-8 place-items-center rounded-full text-white/90 hover:bg-white/10'
  return (
    <>
      <Lightbox.Image
        src={media(file)}
        className="sm:rounded-2xl"
        render={
          isVideo(file) ? (
            <video
              ref={video}
              poster={still(file)}
              muted={muted}
              playsInline
              aria-label={`${person.name}'s story`}
              onEnded={onDone}
            />
          ) : undefined
        }
      />
      <div className="pointer-events-none absolute inset-0 grid place-items-center sm:py-8">
        {/* Same box as the fitted 9:16 image, via container query units on the slide. The only part of
            the viewer that takes the pointer (besides the buttons): swipes, taps and holds start here. */}
        <div
          className="pointer-events-auto relative aspect-9/16 w-[min(100cqw,calc(100cqh*9/16))] opacity-(--lightbox-presence)"
          onPointerDown={() => setHeld(true)}
        >
          <div className="absolute inset-x-0 top-0 bg-linear-to-b from-black/55 to-transparent p-3 pb-12 transition-opacity group-data-dragging:opacity-0 sm:rounded-t-2xl">
            <div className="flex gap-1">
              {person.frames.map((_, f) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: one bar per frame slot
                <div key={f} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35">
                  {f < frame && <div className="h-full bg-white" />}
                  {f === frame &&
                    playing &&
                    (isVideo(file) ? (
                      <div ref={bar} className="h-full origin-left bg-white" style={{ transform: 'scaleX(0)' }} />
                    ) : (
                      <div
                        key={frame}
                        className="h-full origin-left animate-[story-progress_5s_linear_forwards] bg-white group-active/slide:[animation-play-state:paused] group-data-dragging:[animation-play-state:paused]"
                        onAnimationEnd={onDone}
                      />
                    ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <img src={items[slide]!.thumb} alt="" className="size-8 rounded-full object-cover" />
              <span className="font-semibold">{person.name}</span>
              <span className="text-white/60">{person.time}</span>
              <div className="ml-auto flex">
                {isVideo(file) && (
                  <button
                    type="button"
                    className={round}
                    aria-label={muted ? 'Unmute' : 'Mute'}
                    onClick={() => onMute(!muted)}
                  >
                    {icon(
                      muted
                        ? `${SPEAKER}M23 9l-6 6M17 9l6 6`
                        : `${SPEAKER}M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14`,
                    )}
                  </button>
                )}
                <Lightbox.Close className={round} aria-label="Close">
                  {icon('M18 6 6 18M6 6l12 12')}
                </Lightbox.Close>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** Arrows beside the card. They live in the overlay, not on a face, so they stay put while the cube turns. */
function StoryArrows({ onStep }: { onStep: (dir: 1 | -1) => void }) {
  const side =
    'pointer-events-auto absolute top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25 sm:grid'
  return (
    <div className="pointer-events-none absolute inset-0 opacity-(--lightbox-presence)">
      <div className="absolute inset-0 transition-opacity group-data-dragging:opacity-0">
        <button
          type="button"
          aria-label="Previous"
          className={`${side} left-[calc(50%-var(--card-w)/2-3.5rem)]`}
          onClick={() => onStep(-1)}
        >
          {icon('m15 18-6-6 6-6')}
        </button>
        <button
          type="button"
          aria-label="Next"
          className={`${side} right-[calc(50%-var(--card-w)/2-3.5rem)]`}
          onClick={() => onStep(1)}
        >
          {icon('m9 18 6-6-6-6')}
        </button>
      </div>
    </div>
  )
}

function Viewer({ frames, setFrame }: { frames: number[]; setFrame: (person: number, frame: number) => void }) {
  const { index, goTo, close } = useLightbox()
  const [muted, setMuted] = React.useState(true)

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
        // The card: the largest 9:16 that fits (leaving room for the arrows on wider screens).
        // The popup lets the pointer through, so the black around the card can't swipe the carousel
        // and a click there lands on the backdrop, which closes.
        className="group pointer-events-none z-50 text-white outline-none [--card-w:min(100vw,calc(100dvh*9/16))] sm:[--card-w:min(100vw-8rem,calc((100dvh-4rem)*9/16))]"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
          e.preventDefault() // replaces the default slide navigation
          step(index, e.key === 'ArrowRight' ? 1 : -1)
        }}
      >
        {/* Slides as wide as the card, so neighbouring cards share an edge and one swipe is one face. */}
        <Lightbox.Viewport className="px-[calc(50%-var(--card-w)/2)]">
          {people.map((person, i) => (
            <Lightbox.Slide
              key={person.name}
              index={i}
              style={{ flex: '0 0 var(--card-w)', overflow: 'visible' }}
              className="group/slide @container-size sm:py-8"
              onTap={(e) => {
                if (e.target !== 'image') return
                e.preventDefault()
                step(i, e.x < 0.3 ? -1 : 1)
              }}
            >
              {/* The cube turn rotates this face, never the slide: snap points come from the slide's box. */}
              <div className="story-face absolute inset-0">
                <Story
                  person={person}
                  slide={i}
                  frame={frames[i]!}
                  muted={muted}
                  onMute={setMuted}
                  onDone={() => step(i, 1)}
                />
              </div>
            </Lightbox.Slide>
          ))}
        </Lightbox.Viewport>
        <StoryArrows onStep={(dir) => step(index, dir)} />
      </Lightbox.Popup>
    </Lightbox.Portal>
  )
}

export default function Stories() {
  const [frames, setFrames] = React.useState(() => people.map(() => 0))
  const setFrame = (person: number, frame: number) => setFrames((fs) => fs.map((f, i) => (i === person ? frame : f)))

  return (
    <Lightbox.Root items={items} maxZoom={1} onOpenChange={(open) => open && setFrames(people.map(() => 0))}>
      {/* Bleeds to the demo frame's edges with the padding inside, so avatars scroll right up to the border. */}
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 py-2 scrollbar-none sm:-mx-5 sm:px-5">
        {items.map((item, i) => (
          <div key={item.src} className="flex shrink-0 flex-col items-center gap-1.5">
            <span className="rounded-full bg-linear-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2.5px]">
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
