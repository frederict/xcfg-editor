import { describe, expect, it } from 'vitest'
import { drawCompMap, drawThermalAssistant, drawXCAssistant } from '../../../src/render/widgets/map'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'
import type { JsonNode } from '../../../src/core/jsonDocument'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

const language = 'fr'

/**
 * Même convention que numeric.test.ts/statusLine.test.ts : les valeurs sont fournies
 * sous leur forme JS et converties en nœud source exact, y compris pour l'objet
 * `rotation` imbriqué (voir rotation.ts).
 */
function toNode(value: unknown): JsonNode {
  if (typeof value === 'string') return { kind: 'string', raw: JSON.stringify(value) }
  if (typeof value === 'boolean' || typeof value === 'number') return { kind: 'literal', raw: String(value) }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return {
      kind: 'object',
      entries: Object.entries(value as Record<string, unknown>).map(([k, v]) => [`"${k}"`, toNode(v)])
    }
  }
  throw new Error(`valeur de test non prise en charge : ${JSON.stringify(value)}`)
}

function widget(shortName: string, params: Record<string, unknown>): Widget {
  return {
    node: toNode(params) as Extract<JsonNode, { kind: 'object' }>,
    className: `org.xcontest.XCTrack.widget.w.${shortName}`,
    shortName, x1: 0, y1: 0, x2: 10000, y2: 6667,
    border: false, background: 100, theme: ''
  }
}

const TYPES: Array<[string, (widget: Widget, settings: RenderSettings, language: string) => HTMLElement]> = [
  ['WCompMap', drawCompMap],
  ['WXCAssistant', drawXCAssistant],
  ['WThermalAssistant', drawThermalAssistant]
]

describe('widgets cartographiques', () => {
  describe.each(TYPES)('%s', (shortName, draw) => {
    it('dessine le symbole du pilote', () => {
      const el = draw(widget(shortName, {}), settings, language)
      expect(el.querySelector('.xc-map__pilot')).not.toBeNull()
    })

    it('dessine une trace en deux épaisseurs — historique fine, récente épaisse', () => {
      const el = draw(widget(shortName, {}), settings, language)
      expect(el.querySelector('.xc-map__trace-far')).not.toBeNull()
      expect(el.querySelector('.xc-map__trace-recent')).not.toBeNull()
    })

    it('affiche toujours l’étiquette de balise, sur deux lignes (« Décollage » / « [23 m] »)', () => {
      const el = draw(widget(shortName, {}), settings, language)
      const label = el.querySelector('.xc-map__label')
      expect(label?.querySelector('.xc-map__label-name')?.textContent).toBe('Décollage')
      expect(label?.querySelector('.xc-map__label-alt')?.textContent).toBe('[23 m]')
    })

    it('affiche la boussole de coin seulement si rotation.showCompass vaut true', () => {
      const shown = draw(widget(shortName, { rotation: { value: 'NORTH_AT_TOP', showCompass: true } }), settings, language)
      const hidden = draw(widget(shortName, { rotation: { value: 'NORTH_AT_TOP', showCompass: false } }), settings, language)
      const absent = draw(widget(shortName, {}), settings, language)
      expect(shown.querySelector('.xc-map__compass')).not.toBeNull()
      expect(hidden.querySelector('.xc-map__compass')).toBeNull()
      expect(absent.querySelector('.xc-map__compass')).toBeNull()
    })

    it('ne dessine jamais de cercle de thermique', () => {
      // Sauf WThermalAssistant, testé séparément plus bas — describe.each couvre aussi
      // WThermalAssistant ici, mais avec drawCircle absent : le cercle doit rester absent.
      const el = draw(widget(shortName, { drawCircle: true }), settings, language)
      if (shortName !== 'WThermalAssistant') {
        expect(el.querySelector('.xc-map__thermal-circle')).toBeNull()
      }
    })
  })

  // Échelle — clé de gating différente selon le type (relevé du corpus, piège n°2 de
  // cette tâche) : `mapWidget_drawScale` sur WCompMap/WXCAssistant, `drawScale` (sans
  // préfixe) sur WThermalAssistant.
  describe('échelle', () => {
    it('WCompMap l’affiche seulement si mapWidget_drawScale vaut true', () => {
      const shown = drawCompMap(widget('WCompMap', { mapWidget_drawScale: true }), settings, language)
      const hidden = drawCompMap(widget('WCompMap', { mapWidget_drawScale: false }), settings, language)
      // Clé absente : `mapWidget_drawScale` vaut `true` par défaut sur ce type, et la
      // revue des visuels constate au § 2.5 que l'appareil dessine bien sa barre
      // d'échelle là où nous n'en dessinions aucune.
      const absent = drawCompMap(widget('WCompMap', {}), settings, language)
      expect(shown.querySelector('.xc-map__scale')).not.toBeNull()
      expect(hidden.querySelector('.xc-map__scale')).toBeNull()
      expect(absent.querySelector('.xc-map__scale')).not.toBeNull()
    })

    it('WXCAssistant l’affiche seulement si mapWidget_drawScale vaut true', () => {
      const shown = drawXCAssistant(widget('WXCAssistant', { mapWidget_drawScale: true }), settings, language)
      const hidden = drawXCAssistant(widget('WXCAssistant', { mapWidget_drawScale: false }), settings, language)
      expect(shown.querySelector('.xc-map__scale')).not.toBeNull()
      expect(hidden.querySelector('.xc-map__scale')).toBeNull()
    })

    it('WThermalAssistant l’affiche seulement si `drawScale` (sans préfixe) vaut true', () => {
      const shown = drawThermalAssistant(widget('WThermalAssistant', { drawScale: true }), settings, language)
      const hidden = drawThermalAssistant(widget('WThermalAssistant', { drawScale: false }), settings, language)
      // `mapWidget_drawScale` n'est pas la bonne clé pour ce type — verrouille la
      // divergence de nom relevée sur le corpus. Elle ne doit rien déclencher : mettre
      // `drawScale` à `false` doit suffire à éteindre l'échelle, même avec l'autre clé
      // à `true`. (L'absence des deux, elle, laisse jouer le défaut `drawScale: true`.)
      const wrongKey = drawThermalAssistant(widget('WThermalAssistant', { drawScale: false, mapWidget_drawScale: true }), settings, language)
      expect(shown.querySelector('.xc-map__scale')).not.toBeNull()
      expect(hidden.querySelector('.xc-map__scale')).toBeNull()
      expect(wrongKey.querySelector('.xc-map__scale')).toBeNull()
    })

    it('le segment porte sa longueur en texte', () => {
      const el = drawCompMap(widget('WCompMap', { mapWidget_drawScale: true }), settings, language)
      expect(el.querySelector('.xc-map__scale-label')?.textContent).toBeTruthy()
    })
  })

  // Cercle de thermique — WThermalAssistant seulement (consigne explicite de la tâche).
  describe('cercle de thermique', () => {
    it('WThermalAssistant l’affiche seulement si drawCircle vaut true', () => {
      const shown = drawThermalAssistant(widget('WThermalAssistant', { drawCircle: true }), settings, language)
      const hidden = drawThermalAssistant(widget('WThermalAssistant', { drawCircle: false }), settings, language)
      const absent = drawThermalAssistant(widget('WThermalAssistant', {}), settings, language)
      expect(shown.querySelector('.xc-map__thermal-circle')).not.toBeNull()
      expect(hidden.querySelector('.xc-map__thermal-circle')).toBeNull()
      expect(absent.querySelector('.xc-map__thermal-circle')).toBeNull()
    })

    it('WCompMap et WXCAssistant n’en dessinent jamais, même avec drawCircle: true', () => {
      expect(drawCompMap(widget('WCompMap', { drawCircle: true }), settings, language).querySelector('.xc-map__thermal-circle')).toBeNull()
      expect(drawXCAssistant(widget('WXCAssistant', { drawCircle: true }), settings, language).querySelector('.xc-map__thermal-circle')).toBeNull()
    })
  })

  // Trace colorée selon le taux de montée — spécifique à WThermalAssistant
  // (rendu-observe.md : « c'est l'information centrale du widget »).
  describe('trace colorée selon le taux de montée', () => {
    it('seul WThermalAssistant la dessine', () => {
      const thermal = drawThermalAssistant(widget('WThermalAssistant', {}), settings, language)
      const compMap = drawCompMap(widget('WCompMap', {}), settings, language)
      const xcAssistant = drawXCAssistant(widget('WXCAssistant', {}), settings, language)
      expect(thermal.querySelectorAll('.xc-map__trace-climb').length).toBeGreaterThanOrEqual(2)
      expect(compMap.querySelector('.xc-map__trace-climb')).toBeNull()
      expect(xcAssistant.querySelector('.xc-map__trace-climb')).toBeNull()
    })
  })

  // Vent — key nav_showWind présente sur les trois types du corpus, mais l'apparition à
  // l'écran n'est documentée que sur WThermalAssistant (rendu-observe.md, captures
  // widget-WThermalAssistant-*) : restreint à ce seul type, faute d'observation pour
  // les deux autres — voir le rapport de tâche.
  describe('vent', () => {
    it('WThermalAssistant l’affiche seulement si nav_showWind vaut true', () => {
      const shown = drawThermalAssistant(widget('WThermalAssistant', { nav_showWind: true }), settings, language)
      const hidden = drawThermalAssistant(widget('WThermalAssistant', { nav_showWind: false }), settings, language)
      expect(shown.querySelector('.xc-map__wind')).not.toBeNull()
      expect(hidden.querySelector('.xc-map__wind')).toBeNull()
    })

    it('ne s’affiche jamais sur WCompMap ni WXCAssistant, même avec nav_showWind: true', () => {
      expect(drawCompMap(widget('WCompMap', { nav_showWind: true }), settings, language).querySelector('.xc-map__wind')).toBeNull()
      expect(drawXCAssistant(widget('WXCAssistant', { nav_showWind: true }), settings, language).querySelector('.xc-map__wind')).toBeNull()
    })
  })

  // fontSize — SMALL/MEDIUM/LARGE, propre à ces widgets (jamais sur les numériques).
  describe('fontSize', () => {
    it('LARGE agrandit l’étiquette par rapport à SMALL', () => {
      const small = drawThermalAssistant(widget('WThermalAssistant', { fontSize: 'SMALL' }), settings, language)
      const large = drawThermalAssistant(widget('WThermalAssistant', { fontSize: 'LARGE' }), settings, language)
      const smallLabel = small.querySelector('.xc-map__label') as HTMLElement
      const largeLabel = large.querySelector('.xc-map__label') as HTMLElement
      expect(parseFloat(largeLabel.style.fontSize)).toBeGreaterThan(parseFloat(smallLabel.style.fontSize))
    })
  })

  // line_thickness — module la largeur du trait récent (relevé du corpus : 10 ou 20).
  describe('line_thickness', () => {
    it('20 produit un trait récent plus épais que 10', () => {
      const thin = drawCompMap(widget('WCompMap', { line_thickness: 10 }), settings, language)
      const thick = drawCompMap(widget('WCompMap', { line_thickness: 20 }), settings, language)
      const thinWidth = parseFloat(thin.querySelector('.xc-map__trace-recent')?.getAttribute('stroke-width') ?? '0')
      const thickWidth = parseFloat(thick.querySelector('.xc-map__trace-recent')?.getAttribute('stroke-width') ?? '0')
      expect(thickWidth).toBeGreaterThan(thinWidth)
    })
  })
})

/**
 * Écart 2.5 de la revue des 75 visuels — « fond gris, aucune échelle, marqueur pilote deux
 * fois trop gros ». Tout est relevé sur
 * `docs/reference/captures-air3/2026-08-21_planche-sol-6-assistant-thermique-et-carte-xc.png`,
 * cellule de 653 × 646 px.
 */
describe('symbole du pilote (écart 2.5)', () => {
  it('est un dard creux avec un disque orange, pas un polygone plein', () => {
    const el = drawThermalAssistant(widget('WThermalAssistant', {}), settings, language)
    const pilote = el.querySelector('.xc-map__pilot')
    expect(pilote).not.toBeNull()
    expect(pilote?.querySelector('polygon')).not.toBeNull()
    expect(pilote?.querySelector('.xc-map__pilot-dot')).not.toBeNull()
  })

  /**
   * Il mesure 24 × 49 px sur l'assistant thermique comme sur la carte XC de la même
   * capture, dont les échelles diffèrent pourtant d'un facteur 16 : il est de taille
   * FIXE, et ne peut donc pas vivre dans la scène SVG, qui suit la taille du gadget.
   */
  it('vit hors de la scène, qui est mise à l’échelle du gadget', () => {
    const el = drawThermalAssistant(widget('WThermalAssistant', {}), settings, language)
    expect(el.querySelector('.xc-map__scene .xc-map__pilot')).toBeNull()
    expect(el.querySelector(':scope > .xc-map__pilot')).not.toBeNull()
  })

  it('les trois cartes le portent', () => {
    for (const dessin of [drawCompMap, drawXCAssistant, drawThermalAssistant]) {
      expect(dessin(widget('WCompMap', {}), settings, language).querySelector('.xc-map__pilot')).not.toBeNull()
    }
  })
})

describe('barre d’échelle (écart 2.5)', () => {
  it('pose le libellé AU-DESSUS du filet, comme sur la capture', () => {
    const el = drawThermalAssistant(widget('WThermalAssistant', {}), settings, language)
    const echelle = el.querySelector('.xc-map__scale')!
    expect(echelle.firstElementChild?.className).toBe('xc-map__scale-label')
    expect(echelle.lastElementChild?.className).toBe('xc-map__scale-bar')
  })
})
