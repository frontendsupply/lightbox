import { cn } from 'cn'
import { Lightbox, Viewer } from '../lightbox'
import { landscapes, portraits, type Photo } from '../../data/photos'

const posts = [
  { name: 'Ayla Demir', handle: '@ayla', time: '2d', text: 'Seven days on the coast road. Seven completely different landscapes.', photos: landscapes.slice(0, 7) },
  { name: 'Jonas Berg', handle: '@jberg', time: '5h', text: 'First light over the ridge. Worth every minute of the 4am alarm.', photos: landscapes.slice(8, 9) },
  { name: 'Mira Sato', handle: '@mirasato', time: '1d', text: 'Two frames from the same walk.', photos: portraits.slice(0, 2) },
  { name: 'Leo Hart', handle: '@leohart', time: '3d', text: 'Weekend, in three photos.', photos: landscapes.slice(10, 13) },
]

function Media({ photos }: { photos: Photo[] }) {
  const n = photos.length
  return (
    <div
      className={cn(
        'mt-3 grid gap-0.5 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800',
        n > 1 && 'aspect-[16/10] grid-cols-2',
        n > 2 && 'grid-rows-2',
      )}
    >
      {photos.slice(0, 4).map((photo, i) => (
        <Lightbox.Trigger
          key={photo.src}
          index={i}
          className={cn('relative block overflow-hidden bg-neutral-100 outline-none focus-visible:opacity-80 dark:bg-neutral-900', n === 3 && i === 0 && 'row-span-2')}
        >
          <img src={photo.thumb} alt={photo.alt} className={cn('size-full object-cover', n === 1 && 'max-h-[30rem]')} />
          {i === 3 && n > 4 && (
            <span className="absolute inset-0 grid place-items-center bg-black/45 text-2xl font-semibold text-white">+{n - 4}</span>
          )}
        </Lightbox.Trigger>
      ))}
    </div>
  )
}

export default function Feed() {
  return (
    <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {posts.map((post) => (
        <article key={post.handle} className="flex gap-3 p-4">
          <img src={post.photos[0]!.thumb} alt="" className="size-10 shrink-0 rounded-full object-cover" />
          <div className="min-w-0 flex-1 text-[15px]">
            <p>
              <span className="font-semibold">{post.name}</span>{' '}
              <span className="text-neutral-500">
                {post.handle} · {post.time}
              </span>
            </p>
            <p className="mt-0.5">{post.text}</p>
            <Lightbox.Root items={post.photos.map((p) => ({ ...p, caption: post.text }))}>
              <Media photos={post.photos} />
              <Viewer />
            </Lightbox.Root>
          </div>
        </article>
      ))}
    </div>
  )
}
