// Photos from picsum.photos (Unsplash licence). [id, width, height, author]
type Raw = [number, number, number, string]

export type Photo = { src: string; thumb: string; width: number; height: number; alt: string; author: string }

const toPhoto = ([id, w, h, author]: Raw): Photo => {
  const W = w > h ? 1800 : 1200
  const H = Math.round((W * h) / w)
  return {
    src: `https://picsum.photos/id/${id}/${W}/${H}.webp`,
    thumb: `https://picsum.photos/id/${id}/480/${Math.round((480 * h) / w)}.webp`,
    width: W,
    height: H,
    alt: `Photo by ${author}`,
    author,
  }
}

export const landscapes: Photo[] = ([[10,2500,1667,"Paul Jarvis"],[11,2500,1667,"Paul Jarvis"],[13,2500,1667,"Paul Jarvis"],[14,2500,1667,"Paul Jarvis"],[15,2500,1667,"Paul Jarvis"],[16,2500,1667,"Paul Jarvis"],[17,2500,1667,"Paul Jarvis"],[18,2500,1667,"Paul Jarvis"],[19,2500,1667,"Paul Jarvis"],[20,3670,2462,"Aleks Dorohovich"],[24,4855,1803,"Alejandro Escamilla"],[27,3264,1836,"Yoni Kaplan-Nadel"],[28,4928,3264,"Jerry Adney"],[29,4000,2670,"Go Wild"],[33,5000,3333,"Alejandro Escamilla"],[36,4179,2790,"Vadim Sherbakov"],[37,2000,1333,"Austin Neill"],[39,3456,2304,"Luke Chesser"],[41,1280,805,"Nithya Ramanujam"],[42,3456,2304,"Luke Chesser"],[43,1280,831,"Oleg Chursin"],[47,4272,2848,"Christopher Sardegna"],[48,5000,3333,"Luke Chesser"],[49,1280,792,"Margaret Barley"],[50,4608,3072,"Tyler Wanlass"],[54,3264,2176,"Nicholas Swanson"],[55,4608,3072,"Tyler Wanlass"],[56,2880,1920,"Sebastian Muller"],[58,1280,853,"Tony Naccarato"],[59,2464,1632,"Art Wave"]] as Raw[]).map(toPhoto)

export const portraits: Photo[] = ([[23,3887,4899,"Alejandro Escamilla"],[31,3264,4912,"How-Soon Ngu"],[35,2758,3622,"Shane Colella"],[57,2448,3264,"Nicholas Swanson"],[67,2848,4288,"Rula Sibai"],[75,1999,2998,"Jassy Onyae"],[78,1584,2376,"Paul Evans"],[79,2000,3011,"Dorothy Lin"],[88,1280,1707,"Barcelona"],[156,2177,3264,"Christopher Sardegna"],[253,2448,3264,"Bartosz Bąk"],[260,1500,2250,"Sylwia Bartyzel"]] as Raw[]).map(toPhoto)

/** A picsum photo cropped to the aspect ratio `aw:ah`, 1800px on its long side (thumbnails 480px). */
const cropped = (id: number, aw: number, ah: number, author: string): Photo => {
  const size = (long: number) => (aw >= ah ? [long, Math.round((long * ah) / aw)] : [Math.round((long * aw) / ah), long])
  const [W, H] = size(1800)
  const [tw, th] = size(480)
  return {
    src: `https://picsum.photos/id/${id}/${W}/${H}.webp`,
    thumb: `https://picsum.photos/id/${id}/${tw}/${th}.webp`,
    width: W!,
    height: H!,
    alt: `Photo by ${author}`,
    author,
  }
}

/** Every shape a real gallery throws at you: portraits, squares, panoramas and everything between. */
export const mixed: Photo[] = [
  cropped(1018, 4, 3, 'Andrew Ridley'),
  cropped(1027, 2, 3, 'Roksolana Zasiadko'),
  cropped(1015, 21, 9, 'Alexey Topolyanskiy'),
  cropped(1049, 1, 1, 'Rosan Harmens'),
  cropped(1036, 3, 2, 'Wolfgang Lutz'),
  cropped(1040, 4, 5, 'Rachel Davis'),
  cropped(1044, 16, 9, 'Steve Carter'),
  cropped(1047, 3, 4, 'sergee bee'),
  cropped(1022, 5, 2, 'Vashishtha Jogi'),
  cropped(1025, 9, 16, 'Matthew Wiebe'),
  cropped(1039, 5, 4, 'Andrew Coelho'),
  cropped(1043, 2, 1, 'Christian Joudrey'),
]
