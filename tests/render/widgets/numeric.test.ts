import { describe, expect, it } from 'vitest'
import { drawNumeric } from '../../../src/render/widgets/numeric'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  // windSpeedUnit et distanceUnit diffèrent volontairement de speedUnit et de leur
  // valeur par défaut : un test qui coïnciderait avec le repli ne prouverait rien.
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

// La langue est un paramètre explicite de dessin, distinct de `settings` : c'est
// l'appelant (à terme src/ui/, une fois la langue système résolue) qui la fournit déjà
// résolue en chaîne — voir resolveLanguage dans src/model/preferences.ts.
const language = 'fr'

/**
 * Les valeurs sont données sous leur forme source. Une valeur entre guillemets produit
 * un nœud `string` et non `literal` : c'est ce que `readString` attend, et l'encoder en
 * littéral rendrait le test impossible à satisfaire avec une implémentation correcte.
 */
/**
 * Largeur par défaut volontairement au-dessus du seuil de rétrécissement du titre
 * (`NARROW_WIDTH_THRESHOLD` dans numeric.ts) : les tests qui ne portent pas sur la
 * largeur ne doivent pas se heurter par accident à ce comportement.
 */
function widget(shortName: string, params: Record<string, string>, bounds: { x1: number; x2: number } = { x1: 0, x2: 10000 }): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: `org.xcontest.XCTrack.widget.w.${shortName}`,
    shortName, x1: bounds.x1, y1: 0, x2: bounds.x2, y2: 1000,
    border: false, background: 100, theme: ''
  }
}

describe('widgets numériques', () => {
  it('affiche titre, valeur et unité', () => {
    const el = drawNumeric(widget('WAltitude', { _title: 'true', titletext: '""', _unit: 'true' }), settings, language)
    // Libellé officiel XCTrack (language === 'fr'), pas la traduction maison.
    expect(el.querySelector('.xc-num__title')?.textContent).toBe('Altitude GPS')
    expect(el.querySelector('.xc-num__unit')?.textContent).toBe('m')
    expect(el.querySelector('.xc-num__value')?.textContent).toBeTruthy()
  })

  it('utilise la langue reçue en paramètre pour le libellé, pas une valeur fixe', () => {
    const el = drawNumeric(widget('WAltitude', { _title: 'true', titletext: '""' }), settings, 'en')
    expect(el.querySelector('.xc-num__title')?.textContent).toBe('GPS Alt')
  })

  it('masque l’unité quand _unit vaut false', () => {
    // _unit est un drapeau d'affichage, pas une unité : il vaut `true` dans les 278
    // occurrences du corpus, et le lire comme une chaîne afficherait « true ».
    const el = drawNumeric(widget('WAltitude', { _unit: 'false' }), settings, language)
    expect(el.querySelector('.xc-num__unit')).toBeNull()
  })

  it('préfère le titre personnalisé', () => {
    const el = drawNumeric(widget('WAltitude', { _title: 'true', titletext: '"Alt GPS"' }), settings, language)
    expect(el.querySelector('.xc-num__title')?.textContent).toBe('Alt GPS')
  })

  it('masque le titre quand _title vaut false', () => {
    const el = drawNumeric(widget('WAltitude', { _title: 'false', titletext: '""' }), settings, language)
    expect(el.querySelector('.xc-num__title')).toBeNull()
  })

  it('applique la couleur et la taille de titre des préférences', () => {
    const el = drawNumeric(widget('WSpeed', { _title: 'true', titletext: '""' }), settings, language)
    const title = el.querySelector('.xc-num__title') as HTMLElement
    // happy-dom ne normalise pas les couleurs en rgb() comme le fait Chrome :
    // la valeur se relit telle qu'elle a été écrite.
    expect(title.style.color).toBe('#f44336')
    expect(title.style.fontSize).toBe('140%')
  })

  it('utilise l’unité des préférences selon la grandeur mesurée', () => {
    // km/h et m/s contiennent une barre oblique : elles se composent en fraction
    // empilée (écart n°1), donc `.xc-num__unit` n'a plus ces chaînes pour texte direct —
    // voir le numérateur/dénominateur, vérifiés par ailleurs.
    const speed = drawNumeric(widget('WSpeed', { _unit: 'true' }), settings, language)
    const vario = drawNumeric(widget('WVerticalSpeed', { _unit: 'true' }), settings, language)
    expect(speed.querySelector('.xc-num__unit-num')?.textContent).toBe('km')
    expect(speed.querySelector('.xc-num__unit-den')?.textContent).toBe('h')
    expect(vario.querySelector('.xc-num__unit-num')?.textContent).toBe('m')
    expect(vario.querySelector('.xc-num__unit-den')?.textContent).toBe('s')
  })

  it('WWindSpeed utilise l’unité de vent dédiée, pas celle de la vitesse sol', () => {
    // Unit.WindSpeed est une préférence distincte de Unit.Speed dans XCTrack : un pilote
    // peut régler sa vitesse sol en km/h et son vent en m/s. Les confondre affiche une
    // unité fausse à côté d'une valeur correcte. windSpeedUnit vaut ici 'm/s' (fraction).
    const el = drawNumeric(widget('WWindSpeed', { _unit: 'true' }), settings, language)
    expect(el.querySelector('.xc-num__unit-num')?.textContent).toBe('m')
    expect(el.querySelector('.xc-num__unit-den')?.textContent).toBe('s')
    expect(el.querySelector('.xc-num__unit-den')?.textContent).not.toBe(settings.speedUnit)
  })

  it('les grandeurs de distance utilisent distanceUnit, pas une unité codée en dur', () => {
    const goal = drawNumeric(widget('WCompDistanceToGoal', { _unit: 'true' }), settings, language)
    const turnpoint = drawNumeric(widget('WNextTurnpointDistance', { _unit: 'true' }), settings, language)
    expect(goal.querySelector('.xc-num__unit')?.textContent).toBe('NM')
    expect(turnpoint.querySelector('.xc-num__unit')?.textContent).toBe('NM')
  })

  // Écart n°1 — unité composée en fraction empilée (rendu-observe.md, lignes 31-41).
  describe('unité composée en fraction', () => {
    it('compose km/h en fraction : numérateur, filet, dénominateur', () => {
      const el = drawNumeric(widget('WSpeed', { _unit: 'true' }), settings, language)
      const unit = el.querySelector('.xc-num__unit')
      expect(unit?.classList.contains('xc-num__unit--fraction')).toBe(true)
      expect(unit?.querySelector('.xc-num__unit-num')?.textContent).toBe('km')
      expect(unit?.querySelector('.xc-num__unit-den')?.textContent).toBe('h')
    })

    it('garde une unité simple sur une ligne', () => {
      const el = drawNumeric(widget('WAltitude', { _unit: 'true' }), settings, language)
      const unit = el.querySelector('.xc-num__unit')
      expect(unit?.classList.contains('xc-num__unit--fraction')).toBe(false)
      expect(unit?.textContent).toBe('m')
    })
  })

  // Écart n°2 — la période de moyennage (`avg`, en ms) rejoint le titre (rendu-observe.md,
  // ligne 43-45). `avg` vaut 2000 ou 8000 sur le corpus (WGlide, WVerticalSpeed,
  // WVarioColumn) : toujours un multiple entier de 1000, d'où `/ 2s` et non `/ 2000ms`.
  describe('période de moyennage dans le titre', () => {
    it('ajoute « / 2s » quand `avg` vaut 2000', () => {
      const el = drawNumeric(widget('WGlide', { _title: 'true', avg: '2000' }), settings, language)
      expect(el.querySelector('.xc-num__title')?.textContent).toBe('Finesse / 2s')
    })

    it('ajoute « / 8s » pour l’autre valeur observée sur le corpus (WGlide, portrait[2])', () => {
      const el = drawNumeric(widget('WGlide', { _title: 'true', avg: '8000' }), settings, language)
      expect(el.querySelector('.xc-num__title')?.textContent).toBe('Finesse / 8s')
    })

    it('n’ajoute rien quand `avg` est absent', () => {
      const el = drawNumeric(widget('WGlide', { _title: 'true' }), settings, language)
      expect(el.querySelector('.xc-num__title')?.textContent).toBe('Finesse')
    })

    it('n’ajoute rien quand `avg` vaut 0', () => {
      const el = drawNumeric(widget('WGlide', { _title: 'true', avg: '0' }), settings, language)
      expect(el.querySelector('.xc-num__title')?.textContent).toBe('Finesse')
    })

    it('n’ajoute pas le suffixe à un titre personnalisé', () => {
      // Aucun widget du corpus ne combine `avg` et un `titletext` non vide (relevé lors
      // de cette tâche) : l'hypothèse n'est pas vérifiable sur les données, mais c'est la
      // seule lecture cohérente avec la consigne qui la formule explicitement.
      const el = drawNumeric(widget('WGlide', { _title: 'true', titletext: '"Ma finesse"', avg: '2000' }), settings, language)
      expect(el.querySelector('.xc-num__title')?.textContent).toBe('Ma finesse')
    })
  })

  // Écart n°3 — fond coloré selon le signe, limité au vario et au gain thermique
  // (rendu-observe.md, ligne 47-49).
  describe('fond coloré selon le signe', () => {
    it('colore la zone de valeur en vert pour un vario positif (exemple statique +2.1)', () => {
      const el = drawNumeric(widget('WVerticalSpeed', {}), settings, language)
      expect(el.querySelector('.xc-num__row')?.classList.contains('xc-num__row--positive')).toBe(true)
    })

    it('ne colore pas une grandeur hors vario/gain, même positive', () => {
      const el = drawNumeric(widget('WAltitude', {}), settings, language)
      const row = el.querySelector('.xc-num__row')
      expect(row?.classList.contains('xc-num__row--positive')).toBe(false)
      expect(row?.classList.contains('xc-num__row--negative')).toBe(false)
    })

    it('la coloration porte sur la zone de valeur, pas sur le widget entier', () => {
      const el = drawNumeric(widget('WVerticalSpeed', {}), settings, language)
      expect(el.classList.contains('xc-num__row--positive')).toBe(false)
      expect(el.querySelector('.xc-num__row')?.classList.contains('xc-num__row--positive')).toBe(true)
    })
  })

  // Écart n°4 — le titre doit tenir dans la largeur du widget (rendu-observe.md,
  // « Les titres doivent s'adapter à la place disponible »).
  describe('taille du titre bornée par la largeur', () => {
    it('un widget étroit reçoit une taille de titre inférieure à celle d’un widget large', () => {
      const narrow = drawNumeric(widget('WAltitude', { _title: 'true' }, { x1: 833, x2: 2292 }), settings, language)
      const wide = drawNumeric(widget('WAltitude', { _title: 'true' }, { x1: 0, x2: 10000 }), settings, language)
      const narrowSize = parseFloat((narrow.querySelector('.xc-num__title') as HTMLElement).style.fontSize)
      const wideSize = parseFloat((wide.querySelector('.xc-num__title') as HTMLElement).style.fontSize)
      expect(narrowSize).toBeLessThan(wideSize)
    })

    it('un widget large garde la taille des préférences, inchangée', () => {
      const wide = drawNumeric(widget('WAltitude', { _title: 'true' }, { x1: 0, x2: 10000 }), settings, language)
      const title = wide.querySelector('.xc-num__title') as HTMLElement
      expect(title.style.fontSize).toBe(`${settings.titleSizePercent}%`)
    })
  })
})
