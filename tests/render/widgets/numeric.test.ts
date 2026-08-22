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
import { titleWidthEm, valueWidthEm } from '../../../src/render/textMetrics'
import { makeTranslator } from '../../../src/i18n/translate'
import frenchMessages from '../../../src/i18n/messages/fr'

/** Notre prose, axe `ui` — jamais la langue des libellés passée à côté. */
const tr = makeTranslator('fr', frenchMessages)

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

    it('reprend le défaut de XCTrack quand `avg` est absent du fichier', () => {
      // Le relevé donne `avg: 2000` à `WGlide` : l'appareil écrit « Finesse / 2s » sur un
      // widget qui ne porte que ses huit clés universelles
      // (`captures-air3/2026-08-21_planche-sol-2-vol-b-et-air-a.png`). Ce test disait
      // l'inverse avant que le rendu consulte les valeurs par défaut.
      const el = drawNumeric(widget('WGlide', { _title: 'true' }), settings, language)
      expect(el.querySelector('.xc-num__title')?.textContent).toBe('Finesse / 2s')
    })

    it('n’ajoute rien quand ni le fichier ni le relevé ne portent `avg`', () => {
      const el = drawNumeric(widget('WAltitude', { _title: 'true' }), settings, language)
      expect(el.querySelector('.xc-num__title')?.textContent).toBe('Altitude GPS')
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

  // Revue des visuels § 1.4 — les valeurs estimées s'écrivent entre crochets, et
  // `use_brackets: true` est le DÉFAUT des six widgets de navigation qui portent la clé.
  // Mesuré sur `captures-air3/2026-08-21_planche-sol-3-air-b-xcontest-navigation-a.png` :
  // `[37] m`, `[∞]`, `[-27] m`.
  describe('crochets des valeurs estimées', () => {
    it('encadre la valeur d’un widget qui ne porte que ses clés universelles', () => {
      const el = drawNumeric(widget('WNextTurnpointDistance', {}), settings, language)
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('[12,4]')
    })

    it('laisse l’unité DEHORS des crochets, comme l’appareil', () => {
      const el = drawNumeric(widget('WNextTurnpointAlt', {}), settings, language)
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('[1800]')
      expect(el.querySelector('.xc-num__unit')?.textContent).toBe('m')
    })

    it('n’encadre rien quand le fichier met `use_brackets` à false', () => {
      const el = drawNumeric(widget('WNextTurnpointDistance', { use_brackets: 'false' }), settings, language)
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('12,4')
    })

    it('n’encadre pas un widget dont le relevé ne porte pas la clé', () => {
      const el = drawNumeric(widget('WAltitude', {}), settings, language)
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('1234')
    })

    it('répercute les deux crochets sur la largeur publiée', () => {
      // Deux caractères de plus, donc une valeur plus large à loger, donc une valeur
      // plus petite une fois `--xc-value-fit` calculée (style.css) : c'est tout
      // l'intérêt de les dessiner — ils changent la place occupée, et le pilote doit le
      // voir.
      const bounds = { x1: 0, x2: 1400 }
      const avec = drawNumeric(widget('WNextTurnpointDistance', {}, bounds), settings, language)
      const sans = drawNumeric(widget('WNextTurnpointDistance', { use_brackets: 'false' }, bounds), settings, language)
      const em = (el: HTMLElement): number => Number(el.style.getPropertyValue('--xc-value-em'))
      expect(em(avec)).toBeGreaterThan(em(sans))
    })
  })

  // Écart n°3 — fond coloré selon le signe, limité au vario et au gain thermique
  // (rendu-observe.md, ligne 47-49).
  describe('fond coloré selon le signe', () => {
    it('colore la zone de valeur en vert pour un vario positif (exemple statique +3.5)', () => {
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

  // Défaut 1 (rapport de tâche) — la taille de la valeur vient de style.css
  // (`--xc-value-size` : la place restante sous le titre) et sa réduction de LARGEUR
  // (`--xc-value-fit`) y est calculée aussi, faute de connaître ici la taille réelle du
  // widget. Ce module ne publie plus que l'ENCOMBREMENT du contenu, dans deux unités
  // différentes parce que la valeur et l'unité ne se dimensionnent pas sur la même
  // chose : `--xc-value-em` en cadratins de la police de la valeur, `--xc-unit-h` en
  // fraction de la hauteur du widget. Que l'appareil réduise bien au contenu est
  // mesuré : « 99 m » et « 0 km/h » sur deux widgets de taille identique de
  // ecran-landscape3-17widgets.png donnent des chiffres de 66 et 73 px.
  describe('encombrement publié pour la réduction de largeur (défaut 1)', () => {
    const valueEm = (el: HTMLElement): number => Number(el.style.getPropertyValue('--xc-value-em'))
    const unitH = (el: HTMLElement): number => Number(el.style.getPropertyValue('--xc-unit-h'))

    it('une valeur longue publie un encombrement plus grand qu’une valeur courte', () => {
      // Seule la longueur de l'exemple diffère (« 1234 » contre « 38 », voir SPECS) :
      // c'est ce que `--xc-value-fit` traduira en réduction, à largeur de widget égale.
      const bounds = { x1: 0, x2: 600 }
      const long = drawNumeric(widget('WAltitude', {}, bounds), settings, language)
      const court = drawNumeric(widget('WSpeed', {}, bounds), settings, language)
      expect(valueEm(long)).toBeGreaterThan(valueEm(court))
    })

    it('l’encombrement ne dépend PAS de la taille du widget : c’est style.css qui l’y confronte', () => {
      // L'ancienne règle mélangeait les deux, et supposait pour cela un rapport de page
      // 16/9 et un titre à 100 % — les deux faux dès que la page changeait de forme.
      const etroit = drawNumeric(widget('WAltitude', {}, { x1: 0, x2: 600 }), settings, language)
      const large = drawNumeric(widget('WAltitude', {}, { x1: 0, x2: 10000 }), settings, language)
      expect(valueEm(etroit)).toBe(valueEm(large))
      expect(unitH(etroit)).toBe(unitH(large))
    })

    it('une unité composée prend moins de place qu’une unité simple : elle s’empile', () => {
      const fraction = drawNumeric(widget('WSpeed', { _unit: 'true' }), settings, language)
      const simple = drawNumeric(widget('WAltitude', { _unit: 'true' }), settings, language)
      expect(unitH(fraction)).toBeGreaterThan(0)
      expect(unitH(fraction)).toBeLessThan(valueWidthEm('km') * 0.41)
      expect(unitH(simple)).toBeGreaterThan(0)
    })

    it('un widget sans unité ne réserve aucune place, gap compris', () => {
      // `unit: ''` dans SPECS pour une heure ou une durée. Le `<span>` d'unité vide, qui
      // ajoutait quand même le `gap` de `.xc-num__row`, n'est plus posé du tout.
      const el = drawNumeric(widget('WTime', {}), settings, language)
      expect(unitH(el)).toBe(0)
      expect(el.querySelector('.xc-num__unit')).toBeNull()
    })

    it('le cerne de la valeur colorée compte dans l’encombrement — il déborde de sa boîte', () => {
      // `-webkit-text-stroke` et le `text-shadow` de repli sortent de la boîte du texte,
      // donc de toute mesure de texte : sans provision, le cerne d'un vario positif
      // mordait le filet de la cellule (14 px d'encre mesurés sur le bord gauche).
      const colore = drawNumeric(widget('WVerticalSpeed', { _unit: 'true' }), settings, language)
      const neutre = drawNumeric(widget('WAltitude', { _unit: 'true' }), settings, language)
      expect(colore.querySelector('.xc-num__row--positive')).not.toBeNull()
      expect(valueEm(colore)).toBeCloseTo(valueWidthEm('+3,5') + 0.1, 6)
      expect(valueEm(neutre)).toBeCloseTo(valueWidthEm('1234'), 6)
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

  /**
   * La finesse s'écrit en rapport, et l'appareil met le **1 devant** : « 1:6,0 », et
   * « 1: » seul quand elle est infinie. Nous écrivions « 8,3 » avec « :1 » en unité — le
   * rapport à l'envers, donc une information fausse : `1:8,3` et `8,3:1` ne désignent pas
   * la même chose.
   *
   * Relevé sur `captures-air3/2026-08-21_planche-competition-4-widgets-de-manche.png`
   * (« finesse au but » et « Finesse pour l'ESS » : un « 1: » en gros chiffres noirs,
   * aucune unité à droite) et sur `captures-air3/vol-thermalassistant-boutonsnavig.png`
   * (« Finesse Pt suivant »). Voir le commentaire de `glideText` dans numeric.ts.
   */
  describe('la finesse s’écrit en rapport, le 1 devant (écart 2.8)', () => {
    for (const [type, attendu] of [
      ['WGlide', '1:8,3'],
      ['WNextTurnpointGlideTo', '[1:6,2]'],
      ['WCompGlideToGoal', '1:5,1']
    ] as const) {
      it(`${type} affiche ${attendu}`, () => {
        const el = drawNumeric(widget(type, {}), settings, 'fr')
        expect(el.querySelector('.xc-num__value')?.textContent).toBe(attendu)
      })
    }

    it('ne pose plus d’unité « :1 » à droite de la valeur', () => {
      for (const type of ['WGlide', 'WNextTurnpointGlideTo', 'WCompGlideToGoal']) {
        const el = drawNumeric(widget(type, {}), settings, 'fr')
        expect(el.querySelector('.xc-num__unit')).toBeNull()
      }
    })

    /**
     * `headless` — mesurée le 2026-08-22, sur le même jeu de pages et au même instant du
     * rejeu : page 4 (`headless: true`) affiche « 4,6 », pages 1, 2 et 5 (`false`)
     * affichent « 1:2,2 ». L'appareil rend les DEUX formes ; nous écrivions toujours la
     * tête.
     */
    it('`headless: true` retire la tête « 1: » et ne laisse que le nombre', () => {
      const el = drawNumeric(widget('WGlide', { headless: 'true' }), settings, 'fr')
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('8,3')
    })

    it('`headless: false` garde la tête, comme la clé absente — son défaut est `false`', () => {
      const ecrit = drawNumeric(widget('WGlide', { headless: 'false' }), settings, 'fr')
      const absent = drawNumeric(widget('WGlide', {}), settings, 'fr')
      expect(ecrit.querySelector('.xc-num__value')?.textContent).toBe('1:8,3')
      expect(absent.querySelector('.xc-num__value')?.textContent).toBe('1:8,3')
    })

    it('la clé vaut pour les quatre types de finesse, crochets compris', () => {
      const el = drawNumeric(widget('WNextTurnpointGlideTo', { headless: 'true' }), settings, 'fr')
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('[6,2]')
    })
  })

  /**
   * Écart 2.12 de la revue des 75 visuels — dix-neuf types que l'appareil remplit et que
   * nous rendions « titre + `--` ». Chaque exemple est lu sur une capture nommée dans
   * `SPECS` (numeric.ts) ; ce test vérifie qu'ils sont bien dessinés par le drawer
   * numérique et non par le repli générique.
   */
  describe('les dix-neuf types repris au repli générique (écart 2.12)', () => {
    for (const [type, valeur, unite] of [
      ['WBrightnessInfo', '87%', null],
      ['WAirSpeed', '32', 'kmh'],
      ['WBearing', 'ESE', null],
      ['WBaroAltitude', '1492', 'm'],
      ['WAMSL', '1492', 'm'],
      ['WTakeoffHeightAbove', '1494', 'm'],
      ['WSunset', '21:08', null],
      ['WSunsetCivil', '21:37', null],
      ['WAltitudeMaximum', '1527', 'm'],
      ['WQNH', '1010,20', 'hPa'],
      ['WXCSpeed', '5,8', 'kmh'],
      ['WTakeoffDistance', '1362', 'DISTANCE'],
      ['WTakeoffCourse', 'NNE', null],
      ['WCompDistanceToESS', '115,9', 'DISTANCE'],
      ['WCompGlideToESS', '1:5,1', null],
      ['WExternalData', '-', null],
      ['WLastEvent', 'DÉCOLLAGE', null],
      ['WLastKey', 'Rien', null]
    ] as const) {
      it(`${type} affiche « ${valeur} »`, () => {
        const el = drawNumeric(widget(type, {}), settings, 'fr')
        expect(el.querySelector('.xc-num__value')?.textContent).toBe(valeur)
        // « DISTANCE » : l'unité de distance vient de la préférence du fichier d'essai,
        // pas du type — la vérifier en dur figerait le jeu d'essai plutôt que le rendu.
        const attendu = unite === 'DISTANCE' ? settings.distanceUnit : unite
        expect(el.querySelector('.xc-num__unit')?.textContent ?? null).toBe(attendu)
      })
    }

    /**
     * Le cas particulier du § 2.12 : l'appareil dessine **l'unité seule**, sans valeur
     * (`planche-vol-2-vol-b-et-air-a.png`, « Vario netto / 0,1s »). Chez nous, l'absence
     * de valeur faisait disparaître l'unité avec elle — alors qu'elle occupe jusqu'à
     * 25 % de la largeur d'une cellule.
     */
    it('WNettoVario dessine son unité m/s sans valeur, calée à droite', () => {
      const el = drawNumeric(widget('WNettoVario', {}), settings, 'fr')
      expect(el.querySelector('.xc-num__value')).toBeNull()
      expect(el.querySelector('.xc-num__unit')?.textContent).toBe('ms')
      expect(el.querySelector('.xc-num__row')?.classList.contains('xc-num__row--unit-only')).toBe(true)
      expect(el.style.getPropertyValue('--xc-value-em')).toBe('0')
    })

    it('le titre reste celui du catalogue, suffixes compris', () => {
      const el = drawNumeric(widget('WNettoVario', {}), settings, 'fr')
      expect(el.querySelector('.xc-num__title')?.textContent).toBe('Vario netto / 0,1s')
    })
  })

  /**
   * `_units` porte un jeton d'énumération, pas une unité affichable. Une page fabriquée
   * par notre éditeur avec `_units: "FOOT"` et portée sur l'appareil y affiche « ft » ;
   * nous écrivions « FOOT », c'est-à-dire une unité qui n'existe pas
   * (`2026-08-21-validation-bout-en-bout.md` § 4.3). Voir la table de `UNIT_TOKENS`
   * dans numeric.ts pour ce qui est mesuré et ce qui est déduit.
   */
  describe('unité forcée par _units : le jeton se traduit en symbole', () => {
    it('« FOOT » s’écrit « ft », le symbole relevé sur l’appareil', () => {
      const el = drawNumeric(widget('WAltitude', { _units: '"FOOT"' }), settings, language)
      expect(el.querySelector('.xc-num__unit')?.textContent).toBe('ft')
    })

    it('traduit aussi les jetons métriques, que le corpus corrobore', () => {
      const de = (type: string, jeton: string): string | null | undefined =>
        drawNumeric(widget(type, { _units: `"${jeton}"` }), settings, language)
          .querySelector('.xc-num__unit')?.textContent
      expect(de('WAltitude', 'METER')).toBe('m')
      // Une unité composée se compose en fraction : le texte du `<span>` est « km » + « h ».
      expect(de('WSpeed', 'KM_H')).toBe('kmh')
      expect(de('WSpeed', 'M_S')).toBe('ms')
    })

    it('laisse SYS_UNIT rendre la main à la préférence du fichier', () => {
      const el = drawNumeric(widget('WAltitude', { _units: '"SYS_UNIT"' }), settings, language)
      expect(el.querySelector('.xc-num__unit')?.textContent).toBe(settings.altitudeUnit)
    })

    it('écrit un jeton inconnu tel quel plutôt que d’affirmer une unité non mesurée', () => {
      const el = drawNumeric(widget('WAltitude', { _units: '"FURLONG"' }), settings, language)
      expect(el.querySelector('.xc-num__unit')?.textContent).toBe('FURLONG')
    })
  })

  // Défaut 3 (rapport de tâche) — XCTrack affiche « +3,5 » et « -0,1 » en français
  // (virgule), pas « +3.5 » (point) : constaté sur vol-numeriques-boussole-
  // variocolumn.png et vol-carte-kk7-sideview.png. Nos exemples (SPECS) sont écrits
  // avec un point ; seule la présentation doit suivre la langue.
  describe('séparateur décimal selon la langue (défaut 3)', () => {
    it('affiche une virgule en français', () => {
      const el = drawNumeric(widget('WGlide', {}), settings, 'fr')
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('1:8,3')
    })

    it('garde le point en anglais', () => {
      const el = drawNumeric(widget('WGlide', {}), settings, 'en')
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('1:8.3')
    })

    it('reconnaît un code de langue système complet (ex. fr-FR), pas seulement le code court', () => {
      // resolveLanguage (src/model/preferences.ts) peut relayer navigator.language tel
      // quel (« fr-FR ») quand le fichier ne précise rien — pas seulement le code court
      // du catalogue de libellés (« fr »).
      const el = drawNumeric(widget('WVerticalSpeed', {}), settings, 'fr-FR')
      expect(el.querySelector('.xc-num__value')?.textContent).toBe('+3,5')
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
            const el = drawWidget(widgetOnPage, settings, language, tr)
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
