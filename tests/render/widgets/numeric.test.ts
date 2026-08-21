import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { drawNumeric } from '../../../src/render/widgets/numeric'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'
import { parseJson } from '../../../src/core/parseJson'
import { readLayout } from '../../../src/model/layout'
import { drawWidget } from '../../../src/render/registry'
// Effet de bord : enregistre les dessins connus auprès de l'annuaire (registry.ts) —
// nécessaire au bloc « défaut 4 » plus bas, qui interroge `drawWidget` sur le corpus.
import '../../../src/render/widgets'
import { EXPORTS } from '../../fixtures/paths'
import { titleWidthEm } from '../../../src/render/textMetrics'

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

  // Planche des 75 widgets, § 3 : les 8 clés universelles seules, XCTrack complète
  // `_title` ET `_unit` à `true`. La capture au sol le montre — « 0 km/h », « 73 m »,
  // « 5 FL » dans des cellules qui ne déclarent ni l'un ni l'autre.
  describe('clés absentes : l’appareil complète _title et _unit à true (§ 3 de la planche)', () => {
    it('un widget écrit avec ses seules clés universelles porte titre ET unité', () => {
      const el = drawNumeric(widget('WAltitude', {}), settings, language)
      expect(el.querySelector('.xc-num__title')?.textContent).toBe('Altitude GPS')
      expect(el.querySelector('.xc-num__unit')?.textContent).toBe('m')
    })

    it('une unité composée s’empile même sans _unit dans le fichier', () => {
      const el = drawNumeric(widget('WSpeed', {}), settings, language)
      expect(el.querySelector('.xc-num__unit-num')?.textContent).toBe('km')
      expect(el.querySelector('.xc-num__unit-den')?.textContent).toBe('h')
    })

    it('seul un false EXPLICITE supprime le titre ou l’unité', () => {
      const sansTitre = drawNumeric(widget('WAltitude', { _title: 'false' }), settings, language)
      const sansUnite = drawNumeric(widget('WAltitude', { _unit: 'false' }), settings, language)
      expect(sansTitre.querySelector('.xc-num__title')).toBeNull()
      expect(sansTitre.querySelector('.xc-num__unit')).not.toBeNull()
      expect(sansUnite.querySelector('.xc-num__unit')).toBeNull()
      expect(sansUnite.querySelector('.xc-num__title')).not.toBeNull()
    })
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

  it('applique la couleur de titre des préférences', () => {
    const el = drawNumeric(widget('WSpeed', { _title: 'true', titletext: '""' }), settings, language)
    const title = el.querySelector('.xc-num__title') as HTMLElement
    // happy-dom ne normalise pas les couleurs en rgb() comme le fait Chrome :
    // la valeur se relit telle qu'elle a été écrite.
    expect(title.style.color).toBe('#f44336')
    // La TAILLE, elle, ne se pose plus ici : elle vient de `--xc-title`, la même pour
    // toute la page (canvas.ts/titleFontPx). C'est la correction mesurée sur
    // 2026-08-21_polices-reference.png — voir textMetrics.ts.
    expect(title.style.fontSize).toBe('')
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
  // « Tailles de texte »). La règle a changé de nature : l'appareil ne réduit PAS le
  // titre d'un widget étroit — il en garde partout la même taille (dix-sept mesures,
  // deux captures) et « Altitude GPS » tient sans réduction dans 187 px. Ce qui reste
  // ici n'est donc plus une taille mais la largeur ESTIMÉE du libellé, que style.css
  // compare à `--xc-w` pour ne réduire que ce qui déborderait vraiment.
  describe('garde-fou de largeur du titre', () => {
    it('n’impose plus de taille de police : elle vient de --xc-title, commune à la page', () => {
      const narrow = drawNumeric(widget('WAltitude', { _title: 'true' }, { x1: 833, x2: 2292 }), settings, language)
      const wide = drawNumeric(widget('WAltitude', { _title: 'true' }, { x1: 0, x2: 10000 }), settings, language)
      expect((narrow.querySelector('.xc-num__title') as HTMLElement).style.fontSize).toBe('')
      expect((wide.querySelector('.xc-num__title') as HTMLElement).style.fontSize).toBe('')
    })

    it('publie la largeur estimée du libellé, en cadratins, pour le garde-fou CSS', () => {
      const el = drawNumeric(widget('WAltitude', { _title: 'true' }), settings, language)
      const title = el.querySelector('.xc-num__title') as HTMLElement
      const text = title.textContent ?? ''
      expect(text).toBe('Altitude GPS')
      expect(Number(title.style.getPropertyValue('--xc-title-em'))).toBeCloseTo(titleWidthEm(text), 6)
    })

    it('un libellé plus long publie une largeur plus grande', () => {
      const court = drawNumeric(widget('WSpeed', { _title: 'true' }), settings, language)
      const long = drawNumeric(widget('WVerticalSpeed', { _title: 'true', avg: '2000' }), settings, language)
      const em = (el: HTMLElement): number =>
        Number((el.querySelector('.xc-num__title') as HTMLElement).style.getPropertyValue('--xc-title-em'))
      expect(em(long)).toBeGreaterThan(em(court))
    })
  })

  // Défaut 2 (rapport de tâche) — la valeur doit occuper presque toute la hauteur
  // disponible du widget ; un titre et une unité partagent la place avec elle. La
  // classe `xc-num--no-title` (style.css : `.xc-num--no-title .xc-num__value`) est le
  // seul signal, côté DOM, de ce partage — sans titre à loger au-dessus, la valeur
  // reçoit toute la hauteur.
  describe('la valeur domine la hauteur du widget (défaut 2)', () => {
    // Corrigé par la planche des 75 widgets (planche-widgets-air3.md § 3) : `_title`
    // ABSENT vaut `true` — XCTrack complète la clé à la lecture, et la capture
    // `2026-08-21_planche-sol-1-systeme-et-vol-a.png` montre les douze cellules titrées
    // alors qu'aucune ne déclare la clé. C'est `_title: false`, écrit explicitement, qui
    // supprime le titre. L'ancienne lecture (`absent` ⇒ pas de titre) faisait déborder la
    // valeur, mesurée à 64 % de la hauteur de cellule au lieu de 55 %.
    it('n’ajoute pas xc-num--no-title quand _title est absent — l’appareil le complète à true', () => {
      const el = drawNumeric(widget('WAltitude', {}), settings, language)
      expect(el.classList.contains('xc-num--no-title')).toBe(false)
      expect(el.querySelector('.xc-num__title')?.textContent).toBe('Altitude GPS')
    })

    it('ajoute xc-num--no-title quand _title vaut false', () => {
      const el = drawNumeric(widget('WAltitude', { _title: 'false' }), settings, language)
      expect(el.classList.contains('xc-num--no-title')).toBe(true)
    })

    it('n’ajoute pas xc-num--no-title quand un titre est affiché', () => {
      const el = drawNumeric(widget('WAltitude', { _title: 'true' }), settings, language)
      expect(el.classList.contains('xc-num--no-title')).toBe(false)
    })
  })

  // Défaut 1 (rapport de tâche) — la taille de la valeur vient désormais de style.css
  // (`--xc-value-size` : la place restante sous le titre) ; ce module ne pose plus que
  // le facteur de réduction de LARGEUR, `--xc-value-fit`. Que l'appareil fasse la même
  // chose est maintenant mesuré : « 99 m » et « 0 km/h » sur deux widgets de taille
  // identique de ecran-landscape3-17widgets.png donnent des chiffres de 66 et 73 px.
  describe('réduction de largeur de la valeur (défaut 1)', () => {
    const fit = (el: HTMLElement): number => Number(el.style.getPropertyValue('--xc-value-fit'))

    it('une valeur longue dans un widget étroit est plus réduite qu’une valeur courte dans le même widget', () => {
      // Même boîte étroite pour les deux : seule la longueur de l'exemple diffère
      // (« 1234 » contre « 38 », voir SPECS).
      const bounds = { x1: 0, x2: 600 }
      const long = drawNumeric(widget('WAltitude', {}, bounds), settings, language)
      const short = drawNumeric(widget('WSpeed', {}, bounds), settings, language)
      expect(fit(long)).toBeLessThan(fit(short))
    })

    it('un widget large ne réduit rien, quelle que soit la valeur', () => {
      // Bornes larges par défaut (x1: 0, x2: 10000, voir `widget()`).
      const el = drawNumeric(widget('WAltitude', { _title: 'true' }), settings, language)
      expect(fit(el)).toBe(1)
    })

    it('la réduction ne descend jamais sous la moitié', () => {
      const el = drawNumeric(widget('WAltitude', { _unit: 'true' }, { x1: 0, x2: 120 }), settings, language)
      expect(fit(el)).toBe(0.5)
    })

    it('la valeur et l’unité ne portent plus de taille en ligne : elles suivent --xc-value-fit', () => {
      const bounds = { x1: 0, x2: 600 }
      const el = drawNumeric(widget('WAltitude', { _unit: 'true' }, bounds), settings, language)
      expect((el.querySelector('.xc-num__value') as HTMLElement).style.fontSize).toBe('')
      expect((el.querySelector('.xc-num__unit') as HTMLElement).style.fontSize).toBe('')
    })
  })

  // Mesuré sur 2026-08-21_polices-reference.png : à hauteur de widget égale (199 px),
  // `km/h` se dessine à 51 px de police et `m/s` à 75, soit 1,41 fois plus gros — le
  // rapport exact hampe / hauteur d'x de la police. XCTrack ajuste la fraction sur
  // l'encombrement réel des deux lignes, pas sur une taille nominale.
  describe('taille de la fraction d’unité selon ses glyphes', () => {
    const ratio = (el: HTMLElement): number =>
      Number((el.querySelector('.xc-num__unit--fraction') as HTMLElement).style.getPropertyValue('--xc-unit-fraction'))

    it('m/s, sans hampe ni jambage, se dessine plus gros que km/h', () => {
      const vario = drawNumeric(widget('WVerticalSpeed', { _unit: 'true' }), settings, language)
      const speed = drawNumeric(widget('WSpeed', { _unit: 'true' }), settings, language)
      expect(ratio(vario)).toBeGreaterThan(ratio(speed))
      expect(ratio(vario) / ratio(speed)).toBeCloseTo(1.41, 1)
    })

    it('une unité simple ne porte pas ce réglage : elle suit la hauteur du widget', () => {
      const el = drawNumeric(widget('WAltitudeAboveGround', { _unit: 'true' }), settings, language)
      expect(el.querySelector('.xc-num__unit--fraction')).toBeNull()
      expect((el.querySelector('.xc-num__unit') as HTMLElement).style.getPropertyValue('--xc-unit-fraction')).toBe('')
    })
  })

  // Défaut 3 (rapport de tâche) — XCTrack affiche « +3,5 » et « -0,1 » en français
  // (virgule), pas « +3.5 » (point) : constaté sur vol-numeriques-boussole-
  // variocolumn.png et vol-carte-kk7-sideview.png. Nos exemples (SPECS) sont écrits
  // avec un point ; seule la présentation doit suivre la langue.
  describe('séparateur décimal selon la langue (défaut 3)', () => {
    it('affiche une virgule en français', () => {
      const el = drawNumeric(widget('WGlide', {}), settings, 'fr')
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('8,3')
    })

    it('garde le point en anglais', () => {
      const el = drawNumeric(widget('WGlide', {}), settings, 'en')
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('8.3')
    })

    it('reconnaît un code de langue système complet (ex. fr-FR), pas seulement le code court', () => {
      // resolveLanguage (src/model/preferences.ts) peut relayer navigator.language tel
      // quel (« fr-FR ») quand le fichier ne précise rien — pas seulement le code court
      // du catalogue de libellés (« fr »).
      const el = drawNumeric(widget('WVerticalSpeed', {}), settings, 'fr-FR')
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('+2,1')
    })

    it('ne touche pas une valeur sans décimale', () => {
      const el = drawNumeric(widget('WSpeed', {}), settings, 'fr')
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('38')
    })
  })

  // Défaut 4 (rapport de tâche) — sur l'instrument, un widget sans donnée n'affiche que
  // son titre, l'espace de la valeur restant vide ; notre visionneuse choisit d'afficher
  // « -- » à la place (choix assumé, pas un défaut à corriger). Mais ce « -- » ne doit
  // venir QUE du rendu générique de repli (drawGeneric) : un type numérique qui
  // l'afficherait signalerait une entrée manquante dans SPECS (numeric.ts).
  describe('« -- » réservé au rendu générique de repli (défaut 4)', () => {
    it('aucun widget numérique du corpus n’affiche « -- » comme valeur d’exemple', () => {
      const files = readdirSync(EXPORTS).filter((f) => f.endsWith('.xcfg'))
      const offenders: string[] = []
      for (const file of files) {
        const document = parseJson(readFileSync(EXPORTS + file, 'utf8'))
        const layout = readLayout(document)
        for (const page of [...layout.portrait, ...layout.landscape]) {
          for (const widgetOnPage of page.widgets) {
            const el = drawWidget(widgetOnPage, settings, language)
            if (!el.classList.contains('xc-num')) continue // pas un widget numérique
            const value = el.querySelector('.xc-num__value')?.textContent
            if (value === '--' && !offenders.includes(widgetOnPage.shortName)) {
              offenders.push(widgetOnPage.shortName)
            }
          }
        }
      }
      expect(offenders).toEqual([])
    })
  })
})
