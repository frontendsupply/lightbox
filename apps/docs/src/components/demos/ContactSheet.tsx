import type * as React from 'react'
import { landscapes } from '../../data/photos'
import { Arrows, Chrome, Lightbox, Slides, Toolbar } from '../lightbox'

const frames = landscapes.slice(0, 8)

// Sprocket holes along both edges of the film. `local` makes them scroll with the strip's content.
const film: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(90deg, rgb(255 255 255 / 0.3) 0 7px, transparent 7px 16px), repeating-linear-gradient(90deg, rgb(255 255 255 / 0.3) 0 7px, transparent 7px 16px)',
  backgroundSize: '100% 5px',
  backgroundPosition: 'left top 4px, left bottom 4px',
  backgroundRepeat: 'repeat-x',
  backgroundAttachment: 'local',
}

/** A loop drawn in red grease pencil, stretched over whatever box it sits in. */
const Loop = () => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    className="pointer-events-none absolute -top-2 -left-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] text-red-600"
    fill="none"
    aria-hidden
  >
    <path
      d="M54 5C84 3 98 24 96 52 94 82 72 97 46 95 18 93 3 74 5 47 7 21 27 6 60 9"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
)

export default function ContactSheet() {
  return (
    <Lightbox.Root items={frames}>
      {/* One strip of film; it scrolls along behind the viewer as you swipe. */}
      <div
        className="flex gap-1.5 overflow-x-auto bg-neutral-950 px-1.5 pt-4 pb-6 [scrollbar-color:rgb(255_255_255/0.35)_transparent] [scrollbar-width:thin]"
        style={film}
      >
        {frames.map((frame, i) => (
          <div key={frame.src} className="relative w-36 shrink-0">
            <Lightbox.Trigger
              index={i}
              className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              <img src={frame.thumb} alt={frame.alt} className="aspect-3/2 w-full object-cover" />
            </Lightbox.Trigger>
            <span className="absolute top-full left-0 mt-1 font-mono text-[9px] leading-none text-orange-400">
              ▸ {i + 12}A
            </span>
          </div>
        ))}
      </div>
      <Lightbox.Portal>
        <Lightbox.Backdrop className="z-50 bg-neutral-950" />
        <Lightbox.Popup className="group z-50 text-white outline-none">
          <Slides className="pb-32 sm:pb-32" />
          <Chrome>
            <Toolbar />
            <Arrows />
            <Lightbox.Thumbnails
              className="pointer-events-auto absolute inset-x-0 bottom-0 flex gap-1.5 bg-neutral-900 px-[50%] py-5"
              style={film}
            >
              {frames.map((frame, i) => (
                <Lightbox.Thumbnail key={frame.src} index={i} className="h-12 shrink-0 outline-none">
                  <img src={frame.thumb} alt="" className="aspect-3/2 h-full object-cover" draggable={false} />
                </Lightbox.Thumbnail>
              ))}
              <Lightbox.ThumbnailIndicator>
                <Loop />
              </Lightbox.ThumbnailIndicator>
            </Lightbox.Thumbnails>
          </Chrome>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  )
}
