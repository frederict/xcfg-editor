import { describe, expect, it } from 'vitest'
import {
  CATALOG_LANGUAGES,
  WIDGET_CATALOG,
  WIDGET_FAMILIES,
  catalogEntry,
  catalogText,
  familyLabel,
  familyOf,
  isProWidget,
  visibleFamilies,
  widgetDescription,
  widgetsInFamily
} from '../../src/catalog/widgetCatalog'

/**
 * La référence de ces tests n'est pas le catalogue lui-même — ce serait tautologique —
 * mais le relevé de l'écran d'ajout fait sur un AIR³ 7.2 par défilement exhaustif,
 * consigné dans `docs/reference/edition-native-exploration.md` § 3.2 : 75 entrées,
 * 10 familles, dans l'ordre de l'écran, avec le libellé français, la description
 * française et le badge Pro. Deux sources indépendantes : l'écran contre le binaire.
 */

/** § 3.2 : les 10 familles visibles, dans l'ordre de l'écran, et leurs effectifs. */
const SCREEN_FAMILIES: ReadonlyArray<readonly [string, string, number]> = [
  ['wgSystem', 'Système', 3],
  ['wgFlying', 'En vol', 20],
  ['wgAir', 'Air', 8],
  ['wgXContest', 'XContest/Concours distance', 5],
  ['wgNavigation', 'Navigation', 11],
  ['wgCompetition', 'Compétition', 12],
  ['wgLivetracking', 'Livetracking', 1],
  ['wgButtons', "Boutons d'actions", 9],
  ['wgOthers', 'Autres', 3],
  ['wgTesting', 'Test', 3]
]

/** § 3.2 : les entrées badgées **Pro** à l'écran, toutes familles confondues. */
const SCREEN_PRO: readonly string[] = [
  'WBrightnessInfo',
  'WSunset',
  'WSunsetCivil',
  'WAltitudeMaximum',
  'WAltitudeDataGraph',
  'WOptiUnfinishedFAIPotential',
  'WCompDistanceToESS',
  'WCompAltitudeOverESS',
  'WCompGlideToESS',
  'WCompPercentage',
  'WButtonBrightness',
  'WButtonVolume',
  'WButtonIntentLauncher',
  'WWebView'
]

describe('catalogue de la palette d’ajout', () => {
  it('retrouve les 10 familles visibles, dans l’ordre et les effectifs de l’écran', () => {
    const visible = visibleFamilies()
    expect(visible.map((family) => family.id)).toEqual(SCREEN_FAMILIES.map(([id]) => id))
    expect(visible.map((family) => family.widgets.length)).toEqual(
      SCREEN_FAMILIES.map(([, , count]) => count)
    )
    // Total : les 75 entrées relevées à l'écran, pas une de plus.
    const total = visible.reduce((sum, family) => sum + family.widgets.length, 0)
    expect(total).toBe(75)
  })

  it('rend les libellés français exacts des familles', () => {
    for (const [id, french] of SCREEN_FAMILIES) {
      expect(familyLabel(id, 'fr'), id).toBe(french)
    }
    expect(familyLabel('wgButtons', 'en')).toBe('Action buttons')
  })

  it('conserve l’ordre de l’écran à l’intérieur d’une famille', () => {
    // § 3.2, Système : « Barre d'état », « Luminosité de l'écran », « Dernier événement ».
    expect(widgetsInFamily('wgSystem')).toEqual(['WStatusLine', 'WBrightnessInfo', 'WLastEvent'])
    // § 3.2, Boutons d'actions : neuf boutons, l'ordre relevé n'est pas alphabétique.
    expect(widgetsInFamily('wgButtons')).toEqual([
      'WButtonNavig',
      'WButtonPhone',
      'WButtonCamera',
      'WButtonZoom',
      'WButtonVario',
      'WButtonBrightness',
      'WButtonVolume',
      'WButtonVolumeReminder',
      'WButtonIntentLauncher'
    ])
    expect(catalogEntry('WButtonVario')?.order).toBe(4)
    expect(widgetsInFamily('wgQuiNExistePas')).toEqual([])
  })

  it('rattache chaque widget à la famille où l’écran le montre', () => {
    expect(familyOf('WCompass')).toBe('wgNavigation')
    expect(familyOf('WAltitude')).toBe('wgFlying')
    expect(familyOf('WCompMap')).toBe('wgCompetition')
    expect(familyOf('WLiveMessage')).toBe('wgLivetracking')
    // Widget que XCTrack fabrique lui-même, jamais proposé à l'ajout (§ 3.3).
    expect(familyOf('WProFallback')).toBeUndefined()
    expect(familyOf('WQuelqueChoseDeNouveau')).toBeUndefined()
  })

  it('badge Pro exactement les 14 entrées relevées à l’écran', () => {
    const pro = Object.entries(WIDGET_CATALOG.widgets)
      .filter(([, entry]) => entry.pro)
      .map(([name]) => name)
    expect(new Set(pro)).toEqual(new Set(SCREEN_PRO))
    expect(pro).toHaveLength(SCREEN_PRO.length)
    expect(isProWidget('WBrightnessInfo')).toBe(true)
    expect(isProWidget('WStatusLine')).toBe(false)
    // Un type inconnu n'est pas badgé Pro par défaut.
    expect(isProWidget('WQuelqueChoseDeNouveau')).toBe(false)
  })

  it('rend les descriptions françaises exactes relevées à l’écran', () => {
    expect(widgetDescription('WStatusLine', 'fr')).toBe('Etat du GPS et de la batterie')
    expect(widgetDescription('WAltitudeMaximum', 'fr')).toBe(
      'Altitude GPS la plus élevée atteinte pendant le vol'
    )
    expect(widgetDescription('WLiveMessage', 'fr')).toBe('Message texte reçu du Livetracking')
    expect(widgetDescription('WFreeText', 'fr')).toBe('Notez vous-même ce que vous voulez.')
    expect(widgetDescription('WCompass', 'fr')).toBe(
      'Affichage graphique du cap, du vent et de la navigation actuelle'
    )
  })

  it('substitue le lien que la description de « Potentiel FAI » attend', () => {
    // § 3.2 n° 35 : la description renvoie à https://xctrack.org/fpw.html. Le texte de
    // la ressource porte un `%s` ; l'URL est passée à côté, dans le bytecode.
    const description = widgetDescription('WOptiUnfinishedFAIPotential', 'fr')
    expect(description).toContain('https://xctrack.org/fpw.html')
    expect(description).not.toContain('%s')
    // Les autres descriptions n'ont pas d'argument et sortent inchangées.
    expect(catalogEntry('WStatusLine')?.descriptionArgs).toBeUndefined()
  })

  it('retombe sur l’anglais quand la langue demandée manque', () => {
    // 'xx' n'existe dans aucune locale du catalogue.
    expect(widgetDescription('WStatusLine', 'xx')).toBe('GPS and battery status')
    expect(familyLabel('wgFlying', 'xx')).toBe('Flying')
    expect(catalogText('wStatusLineDescription', 'xx')).toBe('GPS and battery status')
    // Le repli s'applique aussi à une langue partiellement traduite : `hr` ne traduit
    // que quatre descriptions sur 75.
    expect(widgetDescription('WStatusLine', 'hr')).toBe('GPS and battery status')
  })

  it('n’invente rien pour ce qu’il ne connaît pas', () => {
    expect(widgetDescription('WQuelqueChoseDeNouveau', 'fr')).toBeUndefined()
    expect(catalogEntry('WQuelqueChoseDeNouveau')).toBeUndefined()
    expect(catalogText('cetteCleNExistePas', 'fr')).toBeUndefined()
    // Repli final d'un libellé de famille : son identifiant, jamais une chaîne vide.
    expect(familyLabel('wgQuiNExistePas', 'fr')).toBe('wgQuiNExistePas')
  })

  it('garde la famille de debug dans les données mais hors de la palette', () => {
    const debug = WIDGET_FAMILIES.find((family) => family.id === 'debug_wgDebug')
    expect(debug?.hidden).toBe(true)
    expect(debug?.widgets).toHaveLength(8)
    expect(visibleFamilies().map((family) => family.id)).not.toContain('debug_wgDebug')
    // Un fichier peut malgré tout contenir un widget de debug : il reste connu.
    expect(familyOf('WDebugFPS')).toBe('debug_wgDebug')
  })

  it('déclare sa provenance, ses langues et sa couverture', () => {
    expect(WIDGET_CATALOG.meta.source).toMatch(/^XCTrack-/)
    expect(WIDGET_CATALOG.meta.registry).toMatch(/<clinit>$/)
    expect(CATALOG_LANGUAGES).toContain('fr')
    expect(CATALOG_LANGUAGES).toContain('en')
    expect(CATALOG_LANGUAGES.length).toBeGreaterThanOrEqual(33)
    expect(WIDGET_CATALOG.meta.widgetCount).toBe(Object.keys(WIDGET_CATALOG.widgets).length)
    expect(WIDGET_CATALOG.meta.visibleWidgetCount).toBe(75)
    expect(WIDGET_CATALOG.meta.proCount).toBe(SCREEN_PRO.length)
    // Les widgets sans description sont nommés, pas escamotés.
    expect(WIDGET_CATALOG.meta.undescribed).toEqual([])
    expect(WIDGET_CATALOG.meta.describedCount).toBe(WIDGET_CATALOG.meta.widgetCount)
  })

  it('ne désigne que des textes réellement présents dans le pool', () => {
    for (const family of WIDGET_FAMILIES) {
      expect(catalogText(family.id, 'en'), family.id).toBeTruthy()
    }
    for (const [name, entry] of Object.entries(WIDGET_CATALOG.widgets)) {
      expect(entry.description, name).toBeTruthy()
      expect(WIDGET_CATALOG.strings[entry.description!], name).toBeDefined()
      // Toute entrée appartient à une famille déclarée, et à la place annoncée.
      const family = WIDGET_FAMILIES.find((candidate) => candidate.id === entry.family)
      expect(family, name).toBeDefined()
      expect(family!.widgets[entry.order], name).toBe(name)
    }
  })
})
