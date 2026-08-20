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
function widget(shortName: string, params: Record<string, string>): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: `org.xcontest.XCTrack.widget.w.${shortName}`,
    shortName, x1: 0, y1: 0, x2: 1000, y2: 1000,
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
    const speed = drawNumeric(widget('WSpeed', { _unit: 'true' }), settings, language)
    const vario = drawNumeric(widget('WVerticalSpeed', { _unit: 'true' }), settings, language)
    expect(speed.querySelector('.xc-num__unit')?.textContent).toBe('km/h')
    expect(vario.querySelector('.xc-num__unit')?.textContent).toBe('m/s')
  })

  it('WWindSpeed utilise l’unité de vent dédiée, pas celle de la vitesse sol', () => {
    // Unit.WindSpeed est une préférence distincte de Unit.Speed dans XCTrack : un pilote
    // peut régler sa vitesse sol en km/h et son vent en m/s. Les confondre affiche une
    // unité fausse à côté d'une valeur correcte.
    const el = drawNumeric(widget('WWindSpeed', { _unit: 'true' }), settings, language)
    expect(el.querySelector('.xc-num__unit')?.textContent).toBe(settings.windSpeedUnit)
    expect(el.querySelector('.xc-num__unit')?.textContent).not.toBe(settings.speedUnit)
  })

  it('les grandeurs de distance utilisent distanceUnit, pas une unité codée en dur', () => {
    const goal = drawNumeric(widget('WCompDistanceToGoal', { _unit: 'true' }), settings, language)
    const turnpoint = drawNumeric(widget('WNextTurnpointDistance', { _unit: 'true' }), settings, language)
    expect(goal.querySelector('.xc-num__unit')?.textContent).toBe('NM')
    expect(turnpoint.querySelector('.xc-num__unit')?.textContent).toBe('NM')
  })
})
