import { beforeEach, describe, expect, it } from 'vitest'
import { deviceFor, type Device } from '../../src/catalog/devices'
import {
  CUSTOM_DEVICES_KEY,
  RESPONSIVE_ID,
  addCustomDevice,
  buildDeviceSelector,
  readCustomDevices
} from '../../src/ui/deviceSelector'

/**
 * `localStorage` de happy-dom : un vrai `Storage`, partagé entre les tests d'un même
 * fichier — d'où le nettoyage avant chacun.
 */
const storage = window.localStorage

function selectorFor(device: Device): { select: HTMLSelectElement; seen: Device[] } {
  const seen: Device[] = []
  const selector = buildDeviceSelector({
    initialDevice: device,
    storage,
    onChange: (chosen) => seen.push(chosen)
  })
  document.body.append(selector.element)
  return { select: selector.select, seen }
}

describe('sélecteur de gabarit', () => {
  beforeEach(() => {
    storage.clear()
    document.body.textContent = ''
  })

  it('découle la sélection initiale de info.device', () => {
    const { select } = selectorFor(deviceFor('AIR3 AIR3-7.3 8.1.0'))
    expect(select.value).toBe('air3-7.3')
  })

  it('retombe sur le gabarit par défaut quand le fichier ne déclare rien', () => {
    const { select } = selectorFor(deviceFor(undefined))
    expect(select.value).toBe('air3-7.2')
  })

  it('conserve les appareils personnalisés d’un chargement à l’autre', () => {
    addCustomDevice(storage, { name: 'Tablette du club', widthPx: 2000, heightPx: 1200, diagonalInches: 8 })

    // Relecture depuis le stockage : c'est ce que fait un rechargement de la page.
    const reloaded = readCustomDevices(storage)
    expect(reloaded).toHaveLength(1)
    expect(reloaded[0]).toMatchObject({
      label: 'Tablette du club', widthPx: 2000, heightPx: 1200, diagonalInches: 8, group: 'Mes appareils'
    })

    const { select } = selectorFor(deviceFor('AIR3 AIR3-7.2 8.1.0'))
    const groups = [...select.querySelectorAll('optgroup')].map((g) => g.label)
    expect(groups).toContain('Mes appareils')
    expect([...select.options].map((o) => o.textContent)).toContain('Tablette du club')
  })

  it('écrit les appareils personnalisés sous la clé attendue, en JSON', () => {
    addCustomDevice(storage, { name: 'AIR³ 7.2', widthPx: 1280, heightPx: 720, diagonalInches: 7 })
    const raw = storage.getItem(CUSTOM_DEVICES_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw as string)).toHaveLength(1)
  })

  it('ignore un stockage corrompu plutôt que de propager une échelle absurde', () => {
    storage.setItem(CUSTOM_DEVICES_KEY, 'ceci n’est pas du JSON')
    expect(readCustomDevices(storage)).toEqual([])

    storage.setItem(CUSTOM_DEVICES_KEY, JSON.stringify([{ id: 'x', label: 'y', widthPx: 0, heightPx: -3 }]))
    expect(readCustomDevices(storage)).toEqual([])
  })

  it('refuse un brouillon incomplet en le disant', () => {
    expect(() => addCustomDevice(storage, { name: '  ', widthPx: 1, heightPx: 1, diagonalInches: 1 }))
      .toThrow(/nom/i)
    expect(() => addCustomDevice(storage, { name: 'X', widthPx: Number.NaN, heightPx: 1, diagonalInches: 1 }))
      .toThrow(/largeur/i)
    expect(readCustomDevices(storage)).toEqual([])
  })

  it('propose « Responsive » et « Ajouter un appareil… » hors des groupes', () => {
    const { select } = selectorFor(deviceFor(undefined))
    const values = [...select.options].map((o) => o.value)
    expect(values).toContain(RESPONSIVE_ID)
    expect(values).toContain('__add__')
  })

  it('reprend la diagonale du gabarit quitté quand on passe en Responsive', () => {
    const { select, seen } = selectorFor(deviceFor('AIR3 AIR3-7.2 8.1.0'))
    select.value = RESPONSIVE_ID
    select.dispatchEvent(new Event('change'))
    const chosen = seen.at(-1)
    expect(chosen?.id).toBe(RESPONSIVE_ID)
    // Le ratio est libre, mais la taille perçue ne doit pas changer à l'insu du pilote.
    expect(chosen?.diagonalInches).toBe(7)
  })

  it('annonce le gabarit choisi à l’appelant, seul effet du sélecteur', () => {
    // Le module n'importe ni `core/` ni `model/` : il ne peut pas toucher au document,
    // et son unique sortie est ce rappel. Le gabarit reste un réglage d'affichage.
    const { seen, select } = selectorFor(deviceFor(undefined))
    select.value = 'ratio-20-9'
    select.dispatchEvent(new Event('change'))
    expect(seen.at(-1)?.id).toBe('ratio-20-9')
  })
})
