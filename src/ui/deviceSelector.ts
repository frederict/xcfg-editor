import { DEVICES, type Device } from '../catalog/devices'
import type { Translator } from '../i18n'

/**
 * Choix du gabarit d'écran — un réglage d'affichage, **jamais** une donnée du fichier.
 * Rien de ce que ce module produit n'est réécrit dans le document : le projet garantit
 * qu'un fichier non modifié ressort à l'octet près, et le gabarit n'a pas d'existence
 * dans le format (`info.device` décrit l'appareil qui a exporté, pas celui qu'on simule).
 *
 * Un gabarit se définit par son **ratio** et sa **diagonale**, jamais par sa résolution :
 * les coordonnées des widgets étant normalisées de 0 à 10000, les pixels n'ont aucun effet
 * sur la géométrie. La diagonale seule décide de la taille perçue, donc de la lisibilité
 * en vol — c'est pourquoi elle est réglable ici pour les ratios génériques, dont la valeur
 * du catalogue n'est qu'indicative.
 */

/** Clé de `localStorage`. Les appareils du pilote survivent au rechargement de la page. */
export const CUSTOM_DEVICES_KEY = 'xcfg-editor.devices'

/**
 * Les trois **marqueurs de groupe** d'un `Device`. Ce sont des valeurs de données, pas de
 * la prose : `CUSTOM_GROUP` part dans `localStorage` avec chaque appareil du pilote, et
 * `'Ratios courants'` est comparé pour décider quels champs afficher. Ils ne peuvent donc
 * pas changer avec la langue — l'intitulé **affiché** du groupe, lui, vient du catalogue
 * (`device.customGroup`, `device.commonRatiosGroup`).
 *
 * « AIR³ » et « Responsive » restent des **noms** : le premier est une marque, le second
 * nomme un gabarit libre et s'écrit de même dans les cinq langues. Aucun n'est traduit,
 * pas plus que « 16:9 ».
 */
export const CUSTOM_GROUP = 'Mes appareils'
export const RESPONSIVE_GROUP = 'Responsive'
export const RESPONSIVE_ID = 'responsive'
const AIR3_GROUP = 'AIR³'
const COMMON_RATIOS_GROUP = 'Ratios courants'

/** Valeur d'option réservée : elle ouvre le formulaire au lieu de choisir un gabarit. */
const ADD_VALUE = '__add__'

const RESPONSIVE_DEFAULT = { widthPx: 1280, heightPx: 720 }

/** Ce que le pilote saisit pour décrire un appareil à lui. */
export interface DeviceDraft {
  name: string
  widthPx: number
  heightPx: number
  diagonalInches: number
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/**
 * Un enregistrement de `localStorage` n'est jamais une donnée de confiance : il peut
 * dater d'une version antérieure, avoir été édité à la main, ou n'être pas du JSON du
 * tout. On valide champ par champ et on ignore en silence ce qui ne tient pas, plutôt
 * que de laisser une valeur absurde produire une échelle fausse en millimètres.
 */
export function readCustomDevices(storage: Storage): Device[] {
  let raw: string | null = null
  try {
    raw = storage.getItem(CUSTOM_DEVICES_KEY)
  } catch {
    return []
  }
  if (raw === null) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const devices: Device[] = []
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) continue
    const candidate = entry as Partial<Device>
    if (typeof candidate.id !== 'string' || candidate.id.length === 0) continue
    if (typeof candidate.label !== 'string' || candidate.label.length === 0) continue
    if (!isPositive(candidate.widthPx)) continue
    if (!isPositive(candidate.heightPx)) continue
    if (!isPositive(candidate.diagonalInches)) continue
    devices.push({
      id: candidate.id,
      label: candidate.label,
      group: CUSTOM_GROUP,
      widthPx: candidate.widthPx,
      heightPx: candidate.heightPx,
      diagonalInches: candidate.diagonalInches
    })
  }
  return devices
}

export function writeCustomDevices(storage: Storage, devices: Device[]): void {
  try {
    storage.setItem(CUSTOM_DEVICES_KEY, JSON.stringify(devices))
  } catch {
    // Navigation privée, quota atteint : le gabarit reste utilisable pour la session.
  }
}

function slug(name: string): string {
  const ascii = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const cleaned = ascii.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return cleaned.length > 0 ? cleaned : 'appareil'
}

/** Identifiant stable et lisible ; le suffixe n'apparaît qu'en cas d'homonyme. */
function freshId(name: string, taken: Device[]): string {
  const base = `custom-${slug(name)}`
  if (!taken.some((device) => device.id === base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`
    if (!taken.some((device) => device.id === candidate)) return candidate
  }
}

/**
 * Valide un brouillon et l'ajoute au stockage. Lève une erreur au message affichable :
 * le formulaire la montre telle quelle plutôt que de deviner ce qui manquait.
 */
export function addCustomDevice(storage: Storage, draft: DeviceDraft, tr: Translator): Device {
  const name = draft.name.trim()
  if (name.length === 0) throw new Error(tr.t('device.nameRequired'))
  if (!isPositive(draft.widthPx) || !isPositive(draft.heightPx)) {
    throw new Error(tr.t('device.sizeMustBePositive'))
  }
  if (!isPositive(draft.diagonalInches)) {
    throw new Error(tr.t('device.diagonalMustBePositive'))
  }

  const existing = readCustomDevices(storage)
  const device: Device = {
    id: freshId(name, existing),
    label: name,
    group: CUSTOM_GROUP,
    widthPx: Math.round(draft.widthPx),
    heightPx: Math.round(draft.heightPx),
    diagonalInches: draft.diagonalInches
  }
  writeCustomDevices(storage, [...existing, device])
  return device
}

export function removeCustomDevice(storage: Storage, id: string): Device[] {
  const kept = readCustomDevices(storage).filter((device) => device.id !== id)
  writeCustomDevices(storage, kept)
  return kept
}

/**
 * Gabarit libre. Les pixels ne servent qu'à fixer le ratio ; la diagonale est reprise du
 * gabarit précédemment choisi, faute de dalle réelle à mesurer.
 */
export function responsiveDevice(widthPx: number, heightPx: number, diagonalInches: number): Device {
  return {
    id: RESPONSIVE_ID,
    label: `Responsive ${Math.round(widthPx)} × ${Math.round(heightPx)}`,
    group: RESPONSIVE_GROUP,
    widthPx,
    heightPx,
    diagonalInches
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function numberField(
  label: string, value: number, step: string, onInput: (value: number) => void
): HTMLElement {
  const wrap = el('label', 'picker__field')
  const input = el('input', 'picker__number')
  input.type = 'number'
  input.min = '1'
  input.step = step
  input.value = String(value)
  input.addEventListener('input', () => {
    const parsed = Number(input.value)
    if (Number.isFinite(parsed) && parsed > 0) onInput(parsed)
  })
  wrap.append(el('span', 'picker__field-label', label), input)
  return wrap
}

export interface DeviceSelectorOptions {
  /** Gabarit déduit de `info.device` — voir `deviceFor`. */
  initialDevice: Device
  /** Notre prose, dans la langue du pilote — voir `src/i18n/CLAUDE.md` § 5. */
  readonly tr: Translator
  storage?: Storage
  onChange: (device: Device) => void
}

export interface DeviceSelector {
  element: HTMLElement
  select: HTMLSelectElement
  /** Gabarit actuellement choisi, pour l'appelant qui redessine. */
  current: () => Device
}

export function buildDeviceSelector(options: DeviceSelectorOptions): DeviceSelector {
  const { tr } = options
  const storage = options.storage ?? window.localStorage
  let custom = readCustomDevices(storage)
  let current = options.initialDevice
  let responsive = responsiveDevice(
    RESPONSIVE_DEFAULT.widthPx, RESPONSIVE_DEFAULT.heightPx, options.initialDevice.diagonalInches
  )

  const root = el('div', 'picker')
  const select = el('select', 'picker__select')
  select.id = 'device-select'
  const label = el('label', 'picker__label', tr.t('device.templateLabel'))
  label.htmlFor = select.id

  const fields = el('div', 'picker__fields')
  const note = el('p', 'picker__note')
  const form = el('form', 'picker__form')
  form.hidden = true

  /* ------------------------------------------------------------------ liste d'options */

  function fillOptions(): void {
    select.textContent = ''
    // Le marqueur qui range l'appareil, et l'intitulé qui s'affiche : jamais la même
    // chose. « AIR³ » est une marque, elle s'écrit pareil dans les cinq langues.
    const groups = [
      { marker: AIR3_GROUP, label: AIR3_GROUP },
      { marker: COMMON_RATIOS_GROUP, label: tr.t('device.commonRatiosGroup') }
    ]
    for (const group of groups) {
      const optgroup = el('optgroup')
      optgroup.label = group.label
      for (const device of DEVICES.filter((d) => d.group === group.marker)) {
        const option = el('option', undefined, device.label)
        option.value = device.id
        optgroup.append(option)
      }
      select.append(optgroup)
    }
    if (custom.length > 0) {
      const optgroup = el('optgroup')
      optgroup.label = tr.t('device.customGroup')
      for (const device of custom) {
        const option = el('option', undefined, device.label)
        option.value = device.id
        optgroup.append(option)
      }
      select.append(optgroup)
    }
    const responsiveOption = el('option', undefined, RESPONSIVE_GROUP)
    responsiveOption.value = RESPONSIVE_ID
    const addOption = el('option', undefined, tr.t('device.addDevice'))
    addOption.value = ADD_VALUE
    select.append(responsiveOption, addOption)
    select.value = current.id
  }

  /* ------------------------------------------- réglages propres au gabarit sélectionné */

  function apply(device: Device): void {
    current = device
    refreshFields()
    options.onChange(device)
  }

  function refreshFields(): void {
    fields.textContent = ''

    if (current.id === RESPONSIVE_ID) {
      // Deux champs seulement : la diagonale n'est pas saisie ici, elle est reprise du
      // gabarit d'où l'on vient — c'est le ratio que « Responsive » sert à explorer.
      fields.append(
        numberField(tr.t('device.widthPx'), current.widthPx, '1', (value) => {
          responsive = responsiveDevice(value, responsive.heightPx, responsive.diagonalInches)
          current = responsive
          refreshNote()
          options.onChange(current)
        }),
        numberField(tr.t('device.heightPx'), current.heightPx, '1', (value) => {
          responsive = responsiveDevice(responsive.widthPx, value, responsive.diagonalInches)
          current = responsive
          refreshNote()
          options.onChange(current)
        })
      )
    } else if (current.group === COMMON_RATIOS_GROUP) {
      // La diagonale du catalogue n'est qu'indicative pour un ratio générique : c'est
      // elle, et non les pixels, qui décide de la taille des widgets en millimètres.
      fields.append(numberField(tr.t('device.diagonalInches'), current.diagonalInches, '0.1', (value) => {
        current = { ...current, diagonalInches: value }
        refreshNote()
        options.onChange(current)
      }))
    }

    refreshNote()
  }

  function refreshNote(): void {
    note.textContent = tr.t('device.note', {
      diagonal: tr.format.inches(current.diagonalInches),
      width: current.widthPx,
      height: current.heightPx
    })
  }

  /* --------------------------------------------------------- ajout d'un appareil */

  const draftName = el('input', 'picker__text')
  draftName.type = 'text'
  draftName.placeholder = tr.t('device.namePlaceholder')
  draftName.setAttribute('aria-label', tr.t('device.namePlaceholder'))

  const draftWidth = el('input', 'picker__number')
  draftWidth.type = 'number'
  draftWidth.min = '1'
  draftWidth.placeholder = tr.t('device.widthPlaceholder')
  draftWidth.setAttribute('aria-label', tr.t('device.widthLabel'))

  const draftHeight = el('input', 'picker__number')
  draftHeight.type = 'number'
  draftHeight.min = '1'
  draftHeight.placeholder = tr.t('device.heightPlaceholder')
  draftHeight.setAttribute('aria-label', tr.t('device.heightLabel'))

  const draftDiagonal = el('input', 'picker__number')
  draftDiagonal.type = 'number'
  draftDiagonal.min = '1'
  draftDiagonal.step = '0.1'
  draftDiagonal.placeholder = tr.t('device.diagonalPlaceholder')
  draftDiagonal.setAttribute('aria-label', tr.t('device.diagonalLabel'))

  const submit = el('button', 'btn btn--primary', tr.t('device.add'))
  submit.type = 'submit'
  const cancel = el('button', 'btn btn--ghost', tr.t('device.cancel'))
  cancel.type = 'button'
  const error = el('p', 'picker__error')
  error.hidden = true

  form.append(draftName, draftWidth, draftHeight, draftDiagonal, submit, cancel, error)

  function closeForm(): void {
    form.hidden = true
    error.hidden = true
    select.value = current.id
  }

  cancel.addEventListener('click', closeForm)

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    try {
      const device = addCustomDevice(storage, {
        name: draftName.value,
        widthPx: Number(draftWidth.value),
        heightPx: Number(draftHeight.value),
        diagonalInches: Number(draftDiagonal.value)
      }, tr)
      custom = readCustomDevices(storage)
      current = device
      fillOptions()
      form.hidden = true
      error.hidden = true
      draftName.value = ''
      draftWidth.value = ''
      draftHeight.value = ''
      draftDiagonal.value = ''
      apply(device)
    } catch (failure) {
      error.textContent = failure instanceof Error ? failure.message : String(failure)
      error.hidden = false
    }
  })

  select.addEventListener('change', () => {
    if (select.value === ADD_VALUE) {
      form.hidden = false
      draftName.focus()
      return
    }
    form.hidden = true
    if (select.value === RESPONSIVE_ID) {
      // La diagonale suit le gabarit quitté : passer d'un 7 pouces à « Responsive » ne
      // doit pas changer la taille perçue en même temps que le ratio.
      responsive = responsiveDevice(responsive.widthPx, responsive.heightPx, current.diagonalInches)
      apply(responsive)
      return
    }
    const found = [...DEVICES, ...custom].find((device) => device.id === select.value)
    if (found) apply(found)
  })

  fillOptions()
  refreshFields()

  root.append(label, select, fields, note, form)
  return { element: root, select, current: () => current }
}
