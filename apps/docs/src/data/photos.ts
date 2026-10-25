// Photos from Unsplash in public/photos: <name>.webp, 1800px on the long side, and <name>-thumb.webp. [name, width, height, author]
type Raw = [string, number, number, string]

export type Photo = { src: string; thumb: string; width: number; height: number; alt: string; author: string }

const toPhoto = ([name, w, h, author]: Raw): Photo => {
  const W = w > h ? 1800 : 1200
  return {
    src: `/photos/${name}.webp`,
    thumb: `/photos/${name}-thumb.webp`,
    width: W,
    height: Math.round((W * h) / w),
    alt: `Photo by ${author}`,
    author,
  }
}

export const landscapes: Photo[] = (
  [
    ['coast-road', 7952, 5304, 'Annie Spratt'],
    ['coast-aerial', 3992, 2992, 'Rod Long'],
    ['rocky-coast', 5560, 3712, 'Ian Schneider'],
    ['road-to-sea', 7933, 3400, 'Zongnan Bao'],
    ['shoreline', 5014, 3340, 'Kiril Dobrev'],
    ['sea-cliff', 6016, 4000, 'Greg Jurgajtis'],
    ['palm-road', 5742, 3828, 'Fabio Sasso'],
    ['alpine-lake', 6000, 4000, 'Adam Vradenburg'],
    ['ridge-sunrise', 6016, 4016, 'Sven Pieren'],
    ['dunes', 5835, 3890, 'Wolfgang Hasselmann'],
    ['latte', 5824, 3259, 'Fahmi Fakhrudin'],
    ['cyclists', 6000, 4000, 'Coen van de Broek'],
    ['picnic', 5431, 3621, 'Svitlana'],
    ['monument-valley', 4928, 3264, 'Ganapathy Kumar'],
  ] as Raw[]
).map(toPhoto)

export const portraits: Photo[] = (
  [
    ['pine-path', 4000, 6000, 'Jack Skinner'],
    ['tree-path', 3657, 5486, 'Casper van Battum'],
    ['white-building', 3346, 4736, 'Joel Filipe'],
    ['abiqua-falls', 3213, 4813, 'MJ Tangonan'],
    ['kynance-mews', 3750, 5625, 'Bruno Martins'],
    ['axel-towers', 3994, 4992, 'Joakim Nådell'],
  ] as Raw[]
).map(toPhoto)

/** A photo cropped to the aspect ratio `aw:ah`, 1800px on its long side (thumbnails 480px). */
const cropped = (name: string, aw: number, ah: number, author: string): Photo => {
  const [W, H] = aw >= ah ? [1800, Math.round((1800 * ah) / aw)] : [Math.round((1800 * aw) / ah), 1800]
  return {
    src: `/photos/${name}.webp`,
    thumb: `/photos/${name}-thumb.webp`,
    width: W!,
    height: H!,
    alt: `Photo by ${author}`,
    author,
  }
}

/** Every shape a real gallery throws at you: portraits, squares, panoramas and everything between. */
export const mixed: Photo[] = [
  cropped('villa', 4, 3, 'Yaroslav Alekseenko'),
  cropped('kitchen', 2, 3, 'Sosey Interiors'),
  cropped('olive-tree', 21, 9, 'Vasilis Caravitis'),
  cropped('bedroom', 1, 1, 'Spacejoy'),
  cropped('living-room', 3, 2, 'Lotus Design N Print'),
  cropped('armchair', 4, 5, 'Clay Banks'),
  cropped('pool', 16, 9, 'Frames For Your Heart'),
  cropped('bathroom', 3, 4, 'Phil Hearing'),
  cropped('sea-house', 5, 2, 'Denis Dimitrov'),
  cropped('palms', 9, 16, 'Durian Bullet'),
  cropped('dining-room', 5, 4, 'yann maignan'),
  cropped('olive-wall', 2, 1, 'Lothar Boris Piltz'),
]
