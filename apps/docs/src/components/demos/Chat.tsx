import { cn } from 'cn'
import { landscapes, type Photo, portraits } from '../../data/photos'
import { Lightbox, useLightbox, Viewer } from '../lightbox'

type Message = { from: 'me' | 'them'; text?: string; photos?: Photo[]; time?: string }

const messages: Message[] = [
  { from: 'them', text: 'Made it to the coast!' },
  { from: 'them', photos: [landscapes[0]!], time: '18:02' },
  { from: 'me', text: 'No way. More please' },
  {
    from: 'them',
    photos: [2, 4, 5, 1, 3, 6, 8].map((i) => landscapes[i]!),
    time: '18:05',
  },
  { from: 'them', text: 'The road down was unreal' },
  { from: 'me', text: 'Meanwhile, my view' },
  { from: 'me', photos: [landscapes[10]!], time: '18:09' },
  { from: 'them', text: 'Ha. Tomorrow: waterfalls' },
  { from: 'them', photos: [portraits[3]!, portraits[0]!], time: '18:12' },
]

// One lightbox for the whole thread: swipe through every photo in the conversation, and the chat scrolls behind.
const items = messages.flatMap((m) =>
  (m.photos ?? []).map((photo) => ({ ...photo, caption: `${m.from === 'me' ? 'You' : 'Mira'} · Today ${m.time}` })),
)
const indexOf = (photo: Photo) => items.findIndex((item) => item.src === photo.src)

function Bubble({ from, text, photos = [] }: Message) {
  const { index: current, phase } = useLightbox()
  const mine = from === 'me'
  return (
    <div className={cn('flex', mine && 'justify-end')}>
      {text ? (
        <p
          className={cn(
            'max-w-[75%] rounded-[18px] px-3 py-1.5',
            mine ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-800',
          )}
        >
          {text}
        </p>
      ) : (
        // Every photo carries its own radius, so the morph starts and ends on the exact corner. Past four, the rest
        // hide behind a "+N" tile, which takes the index of whichever hidden photo is open: closing shrinks into it.
        <div className={cn('grid w-[70%] gap-1', photos.length > 1 && 'grid-cols-2')}>
          {photos.slice(0, 4).map((photo, i) => {
            const first = indexOf(photo)
            const hidden = i === 3 && phase !== 'closed' && current > first && current < first + photos.length - 3
            return (
              <Lightbox.Trigger
                key={photo.src}
                index={hidden ? current : first}
                className={cn(
                  'group relative block overflow-hidden bg-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-neutral-900',
                  photos.length > 1 ? 'rounded-xl' : 'rounded-[18px]',
                )}
              >
                <img
                  src={photo.thumb}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  className={cn('w-full', photos.length > 1 ? 'aspect-square object-cover' : 'h-auto')}
                />
                {i === 3 && photos.length > 4 && (
                  <span className="absolute inset-0 grid place-items-center bg-black/45 text-lg font-medium text-white group-data-active:opacity-0">
                    +{photos.length - 4}
                  </span>
                )}
              </Lightbox.Trigger>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Chat() {
  return (
    <Lightbox.Root items={items}>
      <div className="flex aspect-360/600 flex-col-reverse overflow-y-auto">
        <div className="flex flex-col gap-1">
          <p className="mb-2 text-center text-xs text-neutral-500">Today 18:01</p>
          {messages.map((message) => (
            <Bubble key={message.text ?? message.photos![0]!.src} {...message} />
          ))}
        </div>
      </div>
      <Viewer />
    </Lightbox.Root>
  )
}
