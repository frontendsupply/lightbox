import * as React from 'react'
import { landscapes, mixed } from '../../data/photos'
import { Chrome, Lightbox, Slides, useLightbox } from '../lightbox'

const photo = (name: string) => [...landscapes, ...mixed].find((p) => p.src === `/photos/${name}.webp`)!
const products = [
  {
    src: '/photos/sneaker-balance.webp',
    thumb: '/photos/sneaker-balance-thumb.webp',
    width: 2286,
    height: 3200,
    alt: 'Field Sneaker',
    price: 128,
  },
  // By Vooglam Eyewear on Unsplash.
  {
    src: '/photos/glasses.webp',
    thumb: '/photos/glasses-thumb.webp',
    width: 1440,
    height: 1800,
    alt: 'Rose Frames',
    price: 96,
  },
  { ...photo('armchair'), alt: 'Lounge Chair', price: 640 },
  { ...photo('latte'), alt: 'Stoneware Cup', price: 24 },
]
type Product = (typeof products)[number]

const BAG = 'M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0'

/** The bar under the photo. "Add to bag" hands the photo's index to the bag, then closes: the morph lands there. */
function Buy({ landing, onAdd }: { landing: number | null; onAdd: (index: number) => void }) {
  const { item, index, close } = useLightbox<Product>()
  // Close once the bag holds the index and the card has let go of it, so the close picks the bag.
  React.useEffect(() => {
    if (landing !== null) close()
  }, [landing, close])
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <p>
        <span className="font-medium">{item?.alt}</span> <span className="text-neutral-500">${item?.price}</span>
      </p>
      <button
        type="button"
        onClick={() => onAdd(index)}
        className="rounded-full bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-neutral-900"
      >
        Add to bag
      </button>
    </div>
  )
}

export default function FlyToBag() {
  const [landing, setLanding] = React.useState<number | null>(null)
  const [bag, setBag] = React.useState<Product[]>([])
  const last = bag.at(-1)
  return (
    <Lightbox.Root items={products} onOpenChange={(open) => !open && setLanding(null)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium">New in</h3>
        <span className="flex items-center gap-1.5" role="status" aria-label={`${bag.length} items in bag`}>
          <span className="relative grid size-9 place-items-center">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path d={BAG} />
            </svg>
            {/* The landing spot. It holds the flying photo's index, and afterwards shows the last thing added. */}
            <Lightbox.Trigger
              index={landing ?? -1}
              render={<span />}
              tabIndex={-1}
              className="pointer-events-none absolute -top-0.5 -right-0.5 size-5 overflow-hidden rounded-full ring-2 ring-white empty:hidden dark:ring-neutral-950"
            >
              {last && <img src={last.thumb} alt="" className="size-full object-cover" />}
            </Lightbox.Trigger>
          </span>
          <span className="tabular-nums">{bag.length}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {products.map((product, i) => (
          <div key={product.src}>
            <Lightbox.Trigger
              index={landing === i ? -1 : i}
              className="block w-full overflow-hidden rounded-xl bg-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-900"
            >
              <img src={product.thumb} alt={product.alt} className="aspect-square w-full object-cover" />
            </Lightbox.Trigger>
            <p className="mt-2 flex justify-between">
              <span>{product.alt}</span>
              <span className="text-neutral-500 tabular-nums">${product.price}</span>
            </p>
          </div>
        ))}
      </div>

      <Lightbox.Portal>
        <Lightbox.Backdrop className="z-50 bg-white dark:bg-neutral-950" />
        <Lightbox.Popup className="group z-50 text-neutral-900 outline-none dark:text-white">
          <Slides className="sm:pb-24" />
          <Chrome>
            <Lightbox.Close
              aria-label="Close"
              className="pointer-events-auto absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-neutral-900/5 outline-none hover:bg-neutral-900/10 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-white/10 dark:hover:bg-white/20"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Lightbox.Close>
            <Buy
              landing={landing}
              onAdd={(i) => {
                setLanding(i)
                setBag((b) => [...b, products[i]!])
              }}
            />
          </Chrome>
        </Lightbox.Popup>
      </Lightbox.Portal>
    </Lightbox.Root>
  )
}
