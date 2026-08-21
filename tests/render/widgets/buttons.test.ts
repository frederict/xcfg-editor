import { describe, expect, it } from 'vitest'
import {
  drawButtonBrightness,
  drawButtonCamera,
  drawButtonIntentLauncher,
  drawButtonNavig,
  drawButtonPhone,
  drawButtonVario,
  drawButtonVolume,
  drawButtonVolumeReminder,
  drawButtonZoom
} from '../../../src/render/widgets/buttons'
import { isBlankAtRest, isRegistered } from '../../../src/render/registry'
import '../../../src/render/widgets/index'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'm/s', distanceUnit: 'NM', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

/**
 * Bornes par défaut : une case de la grille 4 × 3 en paysage — 2500 × 2414 en
 * coordonnées normalisées, soit 320 × 174 px sur une page 1280 × 720. C'est la géométrie
 * de la planche, celle sur laquelle les pictogrammes ont été calibrés.
 */
function widget(shortName: string, params: Record<string, string> = {}, bounds: { x2: number; y2: number } = { x2: 2500, y2: 2414 }): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: `org.xcontest.XCTrack.widget.w.${shortName}`,
    shortName, x1: 0, y1: 0, x2: bounds.x2, y2: bounds.y2,
    border: true, background: 100, theme: ''
  }
}

/**
 * Écart 1.6 de `docs/reference/planche-widgets-air3.md` § 5 : les neuf boutons étaient
 * rendus en « titre + `--` », comme des numériques vides, et `WButtonBrightness` en case
 * entièrement blanche. `2026-08-21_planche-sol-5-boutons-autres-test.png` montre que
 * l'appareil peint pour chacun un grand pictogramme noir.
 */
describe('les neuf widgets « bouton »', () => {
  const BOUTONS = [
    'WButtonNavig', 'WButtonPhone', 'WButtonCamera', 'WButtonZoom', 'WButtonVario',
    'WButtonBrightness', 'WButtonVolume', 'WButtonVolumeReminder', 'WButtonIntentLauncher'
  ]

  it('les neuf ont un dessin dédié dans l’annuaire — plus aucun repli générique', () => {
    for (const shortName of BOUTONS) expect(isRegistered(shortName)).toBe(true)
  })

  it('aucun n’est traité comme « sans dessin »', () => {
    // La règle établie : si WButtonBrightness disparaissait sur landscape[3] du corpus,
    // c'est qu'un WThermalAssistant de bornes identiques est dessiné APRÈS lui, avec
    // `_bg: 0` — un recouvrement, pas une propriété du type. Voir buttons.ts et
    // rendu-observe.md.
    for (const shortName of BOUTONS) expect(isBlankAtRest(shortName)).toBe(false)
  })

  it('WLiveMessage, lui, ne peint aucun contenu au repos — ce n’est pas la même situation', () => {
    // Sa bande est au premier plan par-dessus la carte sur
    // vol-thermalassistant-boutonsnavig.png et rien ne s'y voit. C'est un fait de rendu,
    // qui ne sert plus qu'à la marque « sans dessin » de la liste des widgets : son fond
    // et son cadre suivent `_bg`/`_border` comme pour tout autre type.
    expect(isBlankAtRest('WLiveMessage')).toBe(true)
  })

  describe('chaque bouton porte son pictogramme', () => {
    it('WButtonNavig : drapeau + cercle barré', () => {
      const el = drawButtonNavig(widget('WButtonNavig', { type: '"ACTION_NEXT_WAYPOINT"' }), settings, 'fr')
      expect(el.querySelector('.xc-button__glyph--flag')).not.toBeNull()
      expect(el.querySelector('.xc-button__glyph--slashed')).not.toBeNull()
    })

    it('WButtonPhone : combiné, et aucun nom de contact tant que le fichier n’en porte pas', () => {
      const el = drawButtonPhone(widget('WButtonPhone'), settings, 'fr')
      expect(el.querySelector('.xc-button__glyph--phone')).not.toBeNull()
      expect(el.querySelector('.xc-button__caption')).toBeNull()
    })

    it('WButtonCamera : appareil photo', () => {
      expect(drawButtonCamera(widget('WButtonCamera'), settings, 'fr')
        .querySelector('.xc-button__glyph--camera')).not.toBeNull()
    })

    it('WButtonZoom : le signe seul, sans pictogramme — mesuré à 0,21 W × 0,39 H', () => {
      const el = drawButtonZoom(widget('WButtonZoom', { type: '"ACTION_ZOOM_IN"' }), settings, 'fr')
      expect(el.querySelector('.xc-button__glyph')).toBeNull()
      expect(el.querySelector('.xc-button__sign')?.textContent).toBe('+')
    })

    it('WButtonVario : barres de vario + haut-parleur', () => {
      const el = drawButtonVario(widget('WButtonVario'), settings, 'fr')
      expect(el.querySelector('.xc-button__glyph--variobars')).not.toBeNull()
      expect(el.querySelector('.xc-button__glyph--speaker')).not.toBeNull()
    })

    it('WButtonBrightness : soleil portant le signe — la case n’est plus vide', () => {
      const el = drawButtonBrightness(widget('WButtonBrightness', { type: '"ACTION_PLUS"' }), settings, 'fr')
      expect(el.querySelector('.xc-button__glyph--sun')).not.toBeNull()
      expect(el.querySelector('.xc-button__glyph-sign')?.textContent).toBe('+')
    })

    it('WButtonVolume : haut-parleur + signe', () => {
      const el = drawButtonVolume(widget('WButtonVolume', { type: '"ACTION_PLUS"' }), settings, 'fr')
      expect(el.querySelector('.xc-button__glyph--speaker')).not.toBeNull()
      expect(el.querySelector('.xc-button__sign')?.textContent).toBe('+')
    })

    it('WButtonVolumeReminder : haut-parleur au-dessus de son libellé, dans la langue du pilote', () => {
      const fr = drawButtonVolumeReminder(widget('WButtonVolumeReminder'), settings, 'fr')
      const en = drawButtonVolumeReminder(widget('WButtonVolumeReminder'), settings, 'en')
      expect(fr.querySelector('.xc-button__glyph--speaker')).not.toBeNull()
      expect(fr.querySelector('.xc-button__caption')?.textContent).toBe('Monter le son')
      expect(en.querySelector('.xc-button__caption')?.textContent).toBe('Turn the volume up')
    })

    it('WButtonIntentLauncher : les clés `title` et `name`, jamais des textes inventés', () => {
      const defauts = drawButtonIntentLauncher(widget('WButtonIntentLauncher'), settings, 'fr')
      expect(defauts.querySelector('.xc-button__mark')?.textContent).toBe('🚀')
      expect(defauts.querySelector('.xc-button__caption')?.textContent).toBe('test')

      const propre = drawButtonIntentLauncher(
        widget('WButtonIntentLauncher', { title: '"⚡"', name: '"réveil"' }), settings, 'fr'
      )
      expect(propre.querySelector('.xc-button__mark')?.textContent).toBe('⚡')
      expect(propre.querySelector('.xc-button__caption')?.textContent).toBe('réveil')
    })
  })

  describe('le signe suit la clé `type`', () => {
    it('ACTION_MINUS et ACTION_ZOOM_OUT donnent un moins, tout le reste un plus', () => {
      const signe = (el: HTMLElement): string | undefined =>
        el.querySelector('.xc-button__sign, .xc-button__glyph-sign')?.textContent ?? undefined
      expect(signe(drawButtonZoom(widget('WButtonZoom', { type: '"ACTION_ZOOM_OUT"' }), settings, 'fr'))).toBe('−')
      expect(signe(drawButtonZoom(widget('WButtonZoom', { type: '"ACTION_ZOOM_IN"' }), settings, 'fr'))).toBe('+')
      expect(signe(drawButtonVolume(widget('WButtonVolume', { type: '"ACTION_MINUS"' }), settings, 'fr'))).toBe('−')
      expect(signe(drawButtonBrightness(widget('WButtonBrightness', { type: '"ACTION_MINUS"' }), settings, 'fr'))).toBe('−')
    })

    it('sans clé `type`, le signe vaut `+` — la valeur par défaut des trois types (§ 3)', () => {
      expect(drawButtonZoom(widget('WButtonZoom'), settings, 'fr')
        .querySelector('.xc-button__sign')?.textContent).toBe('+')
    })
  })

  describe('WButtonVario est le seul titré, et c’est `showTitle` qui le commande', () => {
    it('titre affiché par défaut, dans la couleur de titre du fichier', () => {
      const el = drawButtonVario(widget('WButtonVario'), settings, 'fr')
      const titre = el.querySelector('.xc-button__title') as HTMLElement
      expect(titre?.textContent).toBe('Vario')
      expect(titre.style.color).toBe(settings.titleColor)
    })

    it('showTitle à false le supprime', () => {
      expect(drawButtonVario(widget('WButtonVario', { showTitle: 'false' }), settings, 'fr')
        .querySelector('.xc-button__title')).toBeNull()
    })

    it('aucun autre bouton ne porte de titre', () => {
      const autres: [string, (w: Widget) => HTMLElement][] = [
        ['WButtonNavig', (w) => drawButtonNavig(w, settings, 'fr')],
        ['WButtonPhone', (w) => drawButtonPhone(w, settings, 'fr')],
        ['WButtonCamera', (w) => drawButtonCamera(w, settings, 'fr')],
        ['WButtonZoom', (w) => drawButtonZoom(w, settings, 'fr')],
        ['WButtonBrightness', (w) => drawButtonBrightness(w, settings, 'fr')],
        ['WButtonVolume', (w) => drawButtonVolume(w, settings, 'fr')]
      ]
      for (const [shortName, draw] of autres) {
        expect(draw(widget(shortName, { _title: 'true' })).querySelector('.xc-button__title')).toBeNull()
      }
    })
  })

  describe('étiquette de survol — la seule chose que l’appareil ne dessine pas', () => {
    it('nomme l’action, et signale l’appui long', () => {
      const el = drawButtonNavig(widget('WButtonNavig', { type: '"ACTION_NEXT_WAYPOINT"', longClick: 'true' }), settings, 'fr')
      expect(el.title).toBe('balise suivante (appui long)')
    })

    it('retombe sur l’anglais pour une langue sans traduction maison', () => {
      const el = drawButtonBrightness(widget('WButtonBrightness', { type: '"ACTION_PLUS"', longClick: 'false' }), settings, 'de')
      expect(el.title).toBe('increase')
    })

    it('signale l’appui long même quand le fichier n’écrit pas `longClick`', () => {
      // Le relevé donne `longClick: true` à cinq des neuf boutons : l'ancien `=== true`
      // taisait l'appui long sur tout fichier écrit avec les seules clés universelles.
      const el = drawButtonBrightness(widget('WButtonBrightness', { type: '"ACTION_PLUS"' }), settings, 'fr')
      expect(el.title).toBe('augmenter (appui long)')
    })

    it('aucune étiquette pour un code inconnu — jamais de texte inventé', () => {
      expect(drawButtonZoom(widget('WButtonZoom', { type: '"ACTION_INCONNUE"' }), settings, 'fr').title).toBe('')
    })
  })

  /**
   * Écart 1.2 de la revue des visuels — le cas signalé par le propriétaire, capture à
   * l'appui. `.xc-button__glyph` (style.css) cale le pictogramme sur la SEULE hauteur du
   * widget ; les trois boutons à deux pictogrammes côte à côte occupaient donc une
   * rangée de largeur fixe, et `overflow: hidden` tranchait.
   *
   * La règle de l'appareil, déduite de deux mesures du même dessin : l'encre s'inscrit
   * dans 0,667 L × 0,52 H en gardant son rapport. Voir `MAX_GLYPH_WIDTH` dans buttons.ts.
   */
  describe('cadrage : le pictogramme tient dans la LARGEUR de la case, pas seulement dans sa hauteur', () => {
    // 961 × 2028 en normalisé = 123 × 146 px sur une page 1280 × 720 : la case du
    // fichier du propriétaire, celle de la capture `vol-thermalassistant-boutonsnavig`.
    const CASE_ETROITE = { x2: 961, y2: 2028 }

    const fit = (el: HTMLElement): number => Number(el.style.getPropertyValue('--xc-button-fit'))

    // Deuxième rangée de la planche : les cases y sont plus plates (320 × 149 px, soit
    // 2069 en normalisé) que celles de la grille 4 × 3.
    const CASE_PLATE = { x2: 2500, y2: 2069 }

    it('ne touche à rien aux géométries de la planche — les neuf gardent la taille de style.css', () => {
      expect(fit(drawButtonNavig(widget('WButtonNavig'), settings, 'fr'))).toBe(1)
      expect(fit(drawButtonPhone(widget('WButtonPhone'), settings, 'fr'))).toBe(1)
      expect(fit(drawButtonCamera(widget('WButtonCamera'), settings, 'fr'))).toBe(1)
      expect(fit(drawButtonZoom(widget('WButtonZoom'), settings, 'fr'))).toBe(1)
      expect(fit(drawButtonIntentLauncher(widget('WButtonIntentLauncher'), settings, 'fr'))).toBe(1)
      expect(fit(drawButtonVario(widget('WButtonVario', {}, CASE_PLATE), settings, 'fr'))).toBe(1)
      expect(fit(drawButtonVolume(widget('WButtonVolume', {}, CASE_PLATE), settings, 'fr'))).toBe(1)
      expect(fit(drawButtonBrightness(widget('WButtonBrightness', {}, CASE_PLATE), settings, 'fr'))).toBe(1)
      expect(fit(drawButtonVolumeReminder(widget('WButtonVolumeReminder', {}, CASE_PLATE), settings, 'fr'))).toBe(1)
    })

    it('réduit WButtonNavig dans la case étroite jusqu’à l’encre mesurée sur l’appareil', () => {
      // Rangée de 0,946 fois la hauteur du widget ; case de 123 × 146 px, soit
      // L/H = 0,842. L'appareil y dessine 82 × 45 px.
      const facteur = fit(drawButtonNavig(widget('WButtonNavig', {}, CASE_ETROITE), settings, 'fr'))
      expect(0.946 * facteur * 146).toBeCloseTo(82, 0)
      expect(0.523 * facteur * 146).toBeCloseTo(45, 0)
    })

    it('réduit aussi les deux autres boutons à deux pictogrammes', () => {
      expect(fit(drawButtonVario(widget('WButtonVario', {}, CASE_ETROITE), settings, 'fr'))).toBeLessThan(1)
      expect(fit(drawButtonVolume(widget('WButtonVolume', {}, CASE_ETROITE), settings, 'fr'))).toBeLessThan(1)
    })

    it('ne réduit jamais en deçà du plancher, même sur une case dégénérée', () => {
      const el = drawButtonNavig(widget('WButtonNavig', {}, { x2: 60, y2: 5000 }), settings, 'fr')
      expect(fit(el)).toBe(0.3)
    })
  })

  /**
   * Écart 3.3 — le même dessin, en case large : rapport 2,29 contre 1,82 sur l'appareil,
   * et des traits environ deux fois trop épais. La géométrie ci-dessous est une
   * transcription du profil relevé sur la capture, pas un choix de dessin.
   */
  describe('proportions du drapeau + Ø, relevées sur l’appareil', () => {
    const glyphes = (el: HTMLElement): SVGSVGElement[] =>
      [...el.querySelectorAll('svg')] as SVGSVGElement[]

    it('le drapeau est nettement plus haut que large, et le Ø carré', () => {
      const [flag, slashed] = glyphes(drawButtonNavig(widget('WButtonNavig'), settings, 'fr'))
      expect(flag?.getAttribute('viewBox')).toBe('0 0 62 91')
      expect(slashed?.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('les deux tailles sont écrites en ligne, en cadratins, et donnent le rapport 1,82', () => {
      const [flag, slashed] = glyphes(drawButtonNavig(widget('WButtonNavig'), settings, 'fr'))
      const em = (value: string): number => Number(value.replace('em', ''))
      const hauteur = em(flag!.style.height)
      const largeur = em(flag!.style.width) + 0.209 + em(slashed!.style.width)
      expect(hauteur).toBeCloseTo(0.523, 3)
      expect(largeur / hauteur).toBeCloseTo(1.82, 1)
    })

    it('la base du mât est un arc, plus une barre pleine', () => {
      const [flag] = glyphes(drawButtonNavig(widget('WButtonNavig'), settings, 'fr'))
      const d = flag!.querySelector('path')?.getAttribute('d') ?? ''
      expect(d).toContain('Q')
    })

    it('l’écart entre les deux pictogrammes est celui de la capture', () => {
      const el = drawButtonNavig(widget('WButtonNavig'), settings, 'fr')
      expect(el.querySelector('.xc-button__row')?.getAttribute('style')).toContain('0.209em')
    })
  })
})