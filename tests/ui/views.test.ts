import { beforeEach, describe, expect, it } from 'vitest'
import { DEVICES } from '../../src/catalog/devices'
import {
  DOCK_HEIGHT_DEFAULT,
  DOCK_HEIGHT_KEY,
  DOCK_HEIGHT_MAX,
  DOCK_HEIGHT_MIN,
  clampDockHeight,
  dockHeightCeiling,
  readDockHeight,
  widgetSizeMm,
  writeDockHeight
} from '../../src/ui/views'

describe('taille physique d’un widget', () => {
  const air3 = DEVICES.find((d) => d.id === 'air3-7.2')!

  it('rend les dimensions en millimètres sur l’AIR³ 7.2', () => {
    // Un widget occupant toute la dalle mesure la dalle entière.
    const full = widgetSizeMm({ x1: 0, y1: 0, x2: 10000, y2: 10000 }, air3, 'landscape')
    expect(Math.round(full.widthMm)).toBe(155)
    expect(Math.round(full.heightMm)).toBe(87)
  })

  it('rend un petit widget à l’échelle', () => {
    // Un dixième de large, un huitième de haut. On compare avec une tolérance plutôt
    // qu'en arrondissant : 15,497 mm est à trois millièmes de basculer vers 16, et une
    // diagonale un jour affinée à 7,002 pouces ferait échouer un test pourtant juste.
    const small = widgetSizeMm({ x1: 0, y1: 0, x2: 1000, y2: 1250 }, air3, 'landscape')
    expect(small.widthMm).toBeCloseTo(15.5, 1)
    expect(small.heightMm).toBeCloseTo(10.9, 1)
  })
})

/**
 * Hauteur du bandeau de réglages. Le geste lui-même — poignée, pointeur, clavier — vit
 * dans `main.ts` et ne se teste qu'au navigateur ; ce qui se teste ici est ce dont il
 * dépend : les bornes, et la relecture de ce que `localStorage` a bien voulu rendre.
 */
describe('hauteur du bandeau de réglages', () => {
  /** `localStorage` de happy-dom, partagé entre les tests d'un même fichier. */
  const storage = window.localStorage

  beforeEach(() => { storage.clear() })

  it('plafonne le bandeau à la moitié de ce que la barre de tête laisse', () => {
    // Fenêtre de référence des mesures : 913 px utiles, barre de tête de 56 px.
    // (913 − 56) / 2 = 428, moins 60 px d'enveloppe autour du corps.
    expect(dockHeightCeiling(913)).toBe(368)
    // Le défaut passe dans cette fenêtre-là sans être raboté.
    expect(DOCK_HEIGHT_DEFAULT).toBeLessThan(dockHeightCeiling(913))
  })

  it('ne descend jamais sous le minimum, si basse que soit la fenêtre', () => {
    expect(dockHeightCeiling(300)).toBe(DOCK_HEIGHT_MIN)
    expect(dockHeightCeiling(0)).toBe(DOCK_HEIGHT_MIN)
    expect(dockHeightCeiling(Number.NaN)).toBe(DOCK_HEIGHT_MIN)
  })

  it('ne dépasse jamais le plafond absolu, si haute que soit la fenêtre', () => {
    expect(dockHeightCeiling(4000)).toBe(DOCK_HEIGHT_MAX)
  })

  it('resserre une hauteur demandée entre les deux bornes', () => {
    expect(clampDockHeight(240, 913)).toBe(240)
    expect(clampDockHeight(40, 913)).toBe(DOCK_HEIGHT_MIN)
    expect(clampDockHeight(5000, 913)).toBe(dockHeightCeiling(913))
    // Une fenêtre basse resserre plus tôt qu'une haute : même demande, deux résultats.
    expect(clampDockHeight(360, 700)).toBe(dockHeightCeiling(700))
    expect(clampDockHeight(360, 913)).toBe(360)
  })

  it('retombe sur le défaut plutôt que d’effacer le bandeau, sur un calcul égaré', () => {
    // Un `NaN` sorti d'un `clientY` manquant ne doit pas produire une hauteur nulle.
    expect(clampDockHeight(Number.NaN, 913)).toBe(DOCK_HEIGHT_DEFAULT)
  })

  it('rend une hauteur entière : un demi-pixel ne se règle pas', () => {
    expect(clampDockHeight(240.6, 913)).toBe(241)
  })

  it('relit la hauteur écrite à la session précédente', () => {
    writeDockHeight(storage, 336)
    expect(storage.getItem(DOCK_HEIGHT_KEY)).toBe('336')
    expect(readDockHeight(storage)).toBe(336)
  })

  it('ne rend rien tant que le pilote n’a pas touché la poignée', () => {
    expect(readDockHeight(storage)).toBeUndefined()
  })

  it('rejette en silence une valeur illisible, vide ou absurde', () => {
    for (const corrompu of ['', '   ', 'grand', '{"h":300}', 'NaN', 'Infinity', '-1e9']) {
      storage.setItem(DOCK_HEIGHT_KEY, corrompu)
      expect(readDockHeight(storage)).toBeUndefined()
    }
  })

  it('rejette une valeur hors bornes absolues plutôt que de la resserrer', () => {
    // Resserrer donnerait au pilote une hauteur qu'il n'a jamais demandée, et l'écrirait
    // à sa place au geste suivant. Une valeur d'une autre version est rejetée, pas devinée.
    storage.setItem(DOCK_HEIGHT_KEY, String(DOCK_HEIGHT_MIN - 1))
    expect(readDockHeight(storage)).toBeUndefined()
    storage.setItem(DOCK_HEIGHT_KEY, String(DOCK_HEIGHT_MAX + 1))
    expect(readDockHeight(storage)).toBeUndefined()
    storage.setItem(DOCK_HEIGHT_KEY, '0')
    expect(readDockHeight(storage)).toBeUndefined()
  })

  it('survit à un stockage qui refuse de répondre', () => {
    const mur = {
      getItem() { throw new Error('stockage refusé') },
      setItem() { throw new Error('stockage refusé') }
    } as unknown as Storage
    expect(readDockHeight(mur)).toBeUndefined()
    expect(() => writeDockHeight(mur, 300)).not.toThrow()
  })
})
