import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEVICES } from '../../src/catalog/devices'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { readLayout, type Page } from '../../src/model/layout'
import { readRenderSettings } from '../../src/model/preferences'
import {
  DOCK_HEIGHT_DEFAULT,
  DOCK_HEIGHT_KEY,
  DOCK_HEIGHT_MAX,
  DOCK_HEIGHT_MIN,
  buildDetail,
  clampDockHeight,
  dockHeightCeiling,
  readDockHeight,
  revealOffset,
  widgetSizeMm,
  writeDockHeight,
  type DetailInspecting,
  type ViewContext
} from '../../src/ui/views'
import { PAGES_2026 } from '../fixtures/paths'
import '../../src/render/widgets'

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

/* ------------------------------------------------- la consultation, vue de la page */

/**
 * Le geste de la consultation : cliquer un widget pour lire ses réglages, sans que rien
 * n'entre en édition. Ce qui se vérifie ici est la moitié « page » du geste — la moitié
 * « panneau » vit dans `properties.test.ts`, et la garantie de non-écriture aussi.
 */
const AIR3 = DEVICES.find((device) => device.id === 'air3-7.2')!
const SOURCE = readFileSync(PAGES_2026, 'utf8')

function scene(selection: number | undefined): {
  page: Page
  root: HTMLElement
  chosen: Array<number | undefined>
  document: string
} {
  const doc = parseJson(SOURCE)
  const page = readLayout(doc).landscape[0]!
  const ctx: ViewContext = { device: AIR3, settings: readRenderSettings(doc), language: 'fr' }
  const chosen: Array<number | undefined> = []
  const dock = window.document.createElement('section')
  dock.className = 'dock'
  const inspecting: DetailInspecting = {
    dock,
    selection,
    onSelect: (index) => chosen.push(index)
  }
  const root = buildDetail({
    page,
    index: 0,
    pageCount: 3,
    orientation: 'landscape',
    ctx,
    zoom: 1,
    onBack: () => {},
    onGo: () => {},
    onZoom: () => {},
    inspecting
  })
  return { page, root, chosen, document: serializeJson(doc) }
}

describe('consulter les réglages d’un widget sans entrer en édition', () => {
  it('le bandeau se pose en dernier, sous la page : rien ne partage sa largeur', () => {
    const { root } = scene(undefined)
    // Le principe non négociable du projet : la page est le seul objet dessiné à sa taille
    // réelle, et rien ne vient à côté d'elle. Le bandeau est le dernier enfant, collé en
    // bas par la feuille de style — jamais une colonne latérale.
    expect(root.lastElementChild?.className).toBe('dock')
    expect(root.querySelector('.stage')?.nextElementSibling?.classList.contains('dock'))
      .toBe(false)
    // Et surtout : pas de calque d'édition, pas de barre d'édition.
    expect(root.querySelector('.editor')).toBeNull()
    expect(root.querySelector('.editbar')).toBeNull()
    expect(root.classList.contains('detail--editing')).toBe(false)
  })

  it('chaque widget de la page est une cible de sélection, dans l’ordre du dessin', () => {
    const { page, root } = scene(undefined)
    const zones = [...root.querySelectorAll<HTMLElement>('.hotspot')]
    expect(zones).toHaveLength(page.widgets.length)
    expect(zones.map((zone) => zone.dataset.position))
      .toEqual(page.widgets.map((_, index) => String(index)))
    expect(zones.every((zone) => zone.getAttribute('aria-pressed') === 'false')).toBe(true)
  })

  it('un clic choisit le widget ; le recliquer le relâche', () => {
    const { root, chosen } = scene(undefined)
    root.querySelectorAll<HTMLElement>('.hotspot')[3]!.click()
    expect(chosen).toEqual([3])

    // Même page, mais construite avec le rang déjà choisi : le clic doit alors relâcher.
    const again = scene(3)
    again.root.querySelectorAll<HTMLElement>('.hotspot')[3]!.click()
    expect(again.chosen).toEqual([undefined])
  })

  it('marque sur la page le widget dont on lit les réglages', () => {
    const { root } = scene(2)
    const zones = [...root.querySelectorAll<HTMLElement>('.hotspot')]
    expect(zones[2]!.classList.contains('hotspot--selected')).toBe(true)
    expect(zones[2]!.getAttribute('aria-pressed')).toBe('true')
    expect(zones.filter((zone) => zone.classList.contains('hotspot--selected'))).toHaveLength(1)
  })

  it('un clic dans un interstice de la page relâche la sélection', () => {
    const { root, chosen } = scene(1)
    const zone = root.querySelector<HTMLElement>('.hotspots')!
    zone.dispatchEvent(new window.Event('click', { bubbles: true }))
    expect(chosen).toEqual([undefined])
  })

  it('le relevé sous la page retombe sur le widget choisi quand le curseur est parti', () => {
    const { page, root } = scene(1)
    const readout = root.querySelector<HTMLElement>('.readout')!
    // Ni un intitulé vide ni le nom du dernier survolé : celui qu'on lit.
    expect(readout.querySelector('.readout__class')?.textContent)
      .toBe(page.widgets[1]!.shortName)
    expect(readout.querySelector('.readout__pin')?.textContent).toBe('sélectionné')
  })

  it('sans sélection, il invite au geste et ne nomme rien', () => {
    const { root } = scene(undefined)
    const readout = root.querySelector<HTMLElement>('.readout')!
    expect(readout.querySelector('.readout__class')).toBeNull()
    expect(readout.querySelector('.readout__hint')?.textContent).toContain('ses réglages')
  })

  it('construire la vue n’écrit pas un octet dans le document', () => {
    const doc = parseJson(SOURCE)
    const before = serializeJson(doc)
    const { root, document: after } = scene(4)
    // Le clic non plus : `onSelect` remonte un entier, il ne touche à aucun nœud.
    root.querySelectorAll<HTMLElement>('.hotspot')[0]!.click()
    expect(after).toBe(before)
  })
})

describe('amener la sélection sous les yeux du pilote', () => {
  // La bande mesurée sur la fenêtre de référence de l'audit : 1500 × 950, mode édition,
  // barre de tête à 56 px, bandeau de réglages déployé dont le haut est à 602 px.
  const BAND = { top: 56, bottom: 602 }

  it('ne défile pas quand le gadget est déjà dans la bande', () => {
    expect(revealOffset({ top: 200, bottom: 320 }, BAND)).toBe(0)
  })

  it('remonte juste ce qu’il faut quand le gadget est sous le bandeau', () => {
    // Le cas de l'audit : rang 14 de la page 1, entre 607 et 777 px, entièrement caché
    // par le bandeau de réglages. Il faut descendre de 777 + marge − 602 = 187 px.
    expect(revealOffset({ top: 607, bottom: 777 }, BAND)).toBe(187)
  })

  it('redescend quand le gadget est passé sous la barre de tête', () => {
    // Un offset négatif fait remonter la fenêtre : le haut du gadget revient sous la barre.
    expect(revealOffset({ top: 10, bottom: 90 }, BAND)).toBe(10 - 12 - 56)
  })

  it('aligne le bord supérieur quand le gadget est plus haut que la bande', () => {
    // Page très zoomée, bandeau déployé : rien ne le fera tenir en entier. Son bord
    // supérieur va au haut de la bande — c'est là que se lisent son nom et sa valeur.
    expect(revealOffset({ top: 300, bottom: 1400 }, BAND)).toBe(300 - 56)
  })

  it('n’exige jamais la marge au point de faire dépasser par l’autre bord', () => {
    // Bande de 100 px, gadget de 96 : la marge de 12 px ne tient pas, elle cède à 2 px.
    const band = { top: 0, bottom: 100 }
    expect(revealOffset({ top: 6, bottom: 102 }, band)).toBe(4)
  })

  it('ne défile pas quand la bande est vide ou absurde', () => {
    // Fenêtre trop basse pour loger quoi que ce soit entre les deux bandeaux : mieux vaut
    // ne rien faire que sauter au hasard.
    expect(revealOffset({ top: 100, bottom: 200 }, { top: 400, bottom: 300 })).toBe(0)
    expect(revealOffset({ top: 100, bottom: 200 }, { top: 0, bottom: Number.NaN })).toBe(0)
  })
})
