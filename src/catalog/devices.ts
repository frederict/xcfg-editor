/**
 * Un gabarit se définit par son ratio et sa diagonale, jamais par sa résolution :
 * les coordonnées des widgets étant normalisées de 0 à 10000, les pixels n'ont aucun
 * effet sur la géométrie. La résolution n'est conservée qu'à titre indicatif.
 */
export interface Device {
  id: string
  label: string
  group: string
  widthPx: number
  heightPx: number
  diagonalInches: number
}

export const DEVICES: Device[] = [
  { id: 'air3-7.2', label: 'AIR³ 7.2', group: 'AIR³', widthPx: 1280, heightPx: 720, diagonalInches: 7 },
  { id: 'air3-7.3', label: 'AIR³ 7.3 / 7.3+ / A13', group: 'AIR³', widthPx: 1920, heightPx: 1200, diagonalInches: 7 },
  { id: 'air3-7.35', label: 'AIR³ 7.35 / 7.35+', group: 'AIR³', widthPx: 1920, heightPx: 1080, diagonalInches: 7 },
  { id: 'ratio-16-9', label: '16:9', group: 'Ratios courants', widthPx: 1920, heightPx: 1080, diagonalInches: 6 },
  { id: 'ratio-16-10', label: '16:10', group: 'Ratios courants', widthPx: 1920, heightPx: 1200, diagonalInches: 6 },
  { id: 'ratio-18-9', label: '18:9', group: 'Ratios courants', widthPx: 2160, heightPx: 1080, diagonalInches: 6 },
  { id: 'ratio-19.5-9', label: '19,5:9', group: 'Ratios courants', widthPx: 2340, heightPx: 1080, diagonalInches: 6 },
  { id: 'ratio-20-9', label: '20:9', group: 'Ratios courants', widthPx: 2400, heightPx: 1080, diagonalInches: 6 }
]

const DEFAULT_DEVICE = DEVICES[0]!

/**
 * `info.device` vaut « AIR3 AIR3-7.2 8.1.0 » sur l'appareil de référence. On extrait le
 * numéro de modèle plutôt que de comparer la chaîne entière, dont la partie version
 * d'Android change à chaque mise à jour.
 */
export function deviceFor(infoDevice: string | undefined): Device {
  const match = /AIR3-(\d+\.\d+)/i.exec(infoDevice ?? '')
  if (match) {
    const found = DEVICES.find((d) => d.id === `air3-${match[1]}`)
    if (found) return found
  }
  return DEFAULT_DEVICE
}

/**
 * La diagonale des gabarits du groupe « Ratios courants » est indicative et réglable
 * depuis l'interface (tâche 20) : c'est elle, et non les pixels, qui détermine la
 * taille perçue des widgets.
 */
export interface PhysicalSize { widthMm: number; heightMm: number }

/** Dimensions réelles de la dalle, la diagonale étant donnée en pouces. */
export function physicalSize(device: Device, orientation: 'portrait' | 'landscape'): PhysicalSize {
  const long = Math.max(device.widthPx, device.heightPx)
  const short = Math.min(device.widthPx, device.heightPx)
  const hypotenuse = Math.hypot(long, short)
  const mmPerPixel = (device.diagonalInches * 25.4) / hypotenuse
  const longMm = long * mmPerPixel
  const shortMm = short * mmPerPixel
  return orientation === 'landscape'
    ? { widthMm: longMm, heightMm: shortMm }
    : { widthMm: shortMm, heightMm: longMm }
}
