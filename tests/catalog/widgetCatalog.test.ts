import { beforeAll, describe, expect, it } from 'vitest'
import {
  CATALOG_FALLBACK_LANGUAGE,
  CATALOG_LANGUAGES,
  catalogLanguage,
  loadWidgetCatalog,
  type WidgetCatalog
} from '../../src/catalog/widgetCatalog'

/**
 * La référence de ces tests n'est pas le catalogue lui-même — ce serait tautologique —
 * mais le relevé de l'écran d'ajout fait sur un AIR³ 7.2 par défilement exhaustif,
 * consigné dans `docs/reference/edition-native-exploration.md` § 3.2 : 75 entrées,
 * 10 familles, dans l'ordre de l'écran, avec le libellé français, la description
 * française et le badge Pro. Deux sources indépendantes : l'écran contre le binaire.
 *
 * Depuis la partition par langue, ils vérifient en plus que **chaque** fichier de
 * langue est chargeable et qu'il porte bien le repli anglais : sans lui, 16 des 33
 * langues afficheraient des descriptions vides.
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
  let fr: WidgetCatalog

  beforeAll(async () => {
    fr = await loadWidgetCatalog('fr')
  })

  it('retrouve les 10 familles visibles, dans l’ordre et les effectifs de l’écran', () => {
    const visible = fr.visibleFamilies()
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
      expect(fr.familyLabel(id), id).toBe(french)
    }
  })

  it('conserve l’ordre de l’écran à l’intérieur d’une famille', () => {
    // § 3.2, Système : « Barre d'état », « Luminosité de l'écran », « Dernier événement ».
    expect(fr.widgetsInFamily('wgSystem')).toEqual(['WStatusLine', 'WBrightnessInfo', 'WLastEvent'])
    // § 3.2, Boutons d'actions : neuf boutons, l'ordre relevé n'est pas alphabétique.
    expect(fr.widgetsInFamily('wgButtons')).toEqual([
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
    expect(fr.catalogEntry('WButtonVario')?.order).toBe(4)
    expect(fr.widgetsInFamily('wgQuiNExistePas')).toEqual([])
  })

  it('rattache chaque widget à la famille où l’écran le montre', () => {
    expect(fr.familyOf('WCompass')).toBe('wgNavigation')
    expect(fr.familyOf('WAltitude')).toBe('wgFlying')
    expect(fr.familyOf('WCompMap')).toBe('wgCompetition')
    expect(fr.familyOf('WLiveMessage')).toBe('wgLivetracking')
    // Widget que XCTrack fabrique lui-même, jamais proposé à l'ajout (§ 3.3).
    expect(fr.familyOf('WProFallback')).toBeUndefined()
    expect(fr.familyOf('WQuelqueChoseDeNouveau')).toBeUndefined()
  })

  it('badge Pro exactement les 14 entrées relevées à l’écran', () => {
    const pro = fr.families.flatMap((family) =>
      family.widgets.filter((name) => fr.isProWidget(name))
    )
    expect(new Set(pro)).toEqual(new Set(SCREEN_PRO))
    expect(pro).toHaveLength(SCREEN_PRO.length)
    expect(fr.isProWidget('WBrightnessInfo')).toBe(true)
    expect(fr.isProWidget('WStatusLine')).toBe(false)
    // Un type inconnu n'est pas badgé Pro par défaut.
    expect(fr.isProWidget('WQuelqueChoseDeNouveau')).toBe(false)
  })

  it('rend les descriptions françaises exactes relevées à l’écran', () => {
    expect(fr.widgetDescription('WStatusLine')).toBe('Etat du GPS et de la batterie')
    expect(fr.widgetDescription('WAltitudeMaximum')).toBe(
      'Altitude GPS la plus élevée atteinte pendant le vol'
    )
    expect(fr.widgetDescription('WLiveMessage')).toBe('Message texte reçu du Livetracking')
    expect(fr.widgetDescription('WFreeText')).toBe('Notez vous-même ce que vous voulez.')
    expect(fr.widgetDescription('WCompass')).toBe(
      'Affichage graphique du cap, du vent et de la navigation actuelle'
    )
  })

  it('substitue le lien que la description de « Potentiel FAI » attend', () => {
    // § 3.2 n° 35 : la description renvoie à https://xctrack.org/fpw.html. Le texte de
    // la ressource porte un `%s` ; l'URL est passée à côté, dans le bytecode.
    const description = fr.widgetDescription('WOptiUnfinishedFAIPotential')
    expect(description).toContain('https://xctrack.org/fpw.html')
    expect(description).not.toContain('%s')
    // Les autres descriptions n'ont pas d'argument et sortent inchangées.
    expect(fr.catalogEntry('WStatusLine')?.descriptionArgs).toBeUndefined()
  })

  it('n’invente rien pour ce qu’il ne connaît pas', () => {
    expect(fr.widgetDescription('WQuelqueChoseDeNouveau')).toBeUndefined()
    expect(fr.catalogEntry('WQuelqueChoseDeNouveau')).toBeUndefined()
    expect(fr.catalogText('cetteCleNExistePas')).toBeUndefined()
    // Repli final d'un libellé de famille : son identifiant, jamais une chaîne vide.
    expect(fr.familyLabel('wgQuiNExistePas')).toBe('wgQuiNExistePas')
  })

  it('garde la famille de debug dans les données mais hors de la palette', () => {
    const debug = fr.families.find((family) => family.id === 'debug_wgDebug')
    expect(debug?.hidden).toBe(true)
    expect(debug?.widgets).toHaveLength(8)
    expect(fr.visibleFamilies().map((family) => family.id)).not.toContain('debug_wgDebug')
    // Un fichier peut malgré tout contenir un widget de debug : il reste connu.
    expect(fr.familyOf('WDebugFPS')).toBe('debug_wgDebug')
  })

  it('déclare sa provenance, ses langues et sa couverture', () => {
    expect(fr.meta.source).toMatch(/^XCTrack-/)
    expect(fr.meta.registry).toMatch(/<clinit>$/)
    expect(CATALOG_LANGUAGES).toContain('fr')
    expect(CATALOG_LANGUAGES).toContain('en')
    expect(CATALOG_LANGUAGES.length).toBeGreaterThanOrEqual(33)
    expect(fr.meta.widgetCount).toBe(83)
    expect(fr.meta.visibleWidgetCount).toBe(75)
    expect(fr.meta.proCount).toBe(SCREEN_PRO.length)
    // Les widgets sans description sont nommés, pas escamotés.
    expect(fr.meta.undescribed).toEqual([])
    expect(fr.meta.describedCount).toBe(fr.meta.widgetCount)
  })

  it('ne désigne que des textes réellement présents dans le pool', () => {
    for (const family of fr.families) {
      expect(fr.catalogText(family.id), family.id).toBeTruthy()
    }
    for (const family of fr.families) {
      family.widgets.forEach((name, rank) => {
        const entry = fr.catalogEntry(name)
        expect(entry, name).toBeDefined()
        expect(entry!.description, name).toBeTruthy()
        expect(fr.catalogText(entry!.description!), name).toBeTruthy()
        // Toute entrée est à la place que le catalogue lui annonce.
        expect(entry!.family, name).toBe(family.id)
        expect(entry!.order, name).toBe(rank)
      })
    }
  })
})

describe('partition du catalogue par langue', () => {
  it('choisit le fichier de la langue demandée, l’anglais à défaut', () => {
    expect(catalogLanguage('fr')).toBe('fr')
    expect(catalogLanguage('zh-TW')).toBe('zh-TW')
    // 'xx' n'existe dans aucune locale du catalogue.
    expect(catalogLanguage('xx')).toBe('en')
    // Limite connue, volontairement identique à celle de widgetNames.ts et
    // widgetOptions.ts : la comparaison est exacte, `fr-FR` ne retombe pas sur `fr`.
    // Elle n'est pas corrigée ici seul — voir le commentaire de `catalogLanguage`.
    expect(catalogLanguage('fr-FR')).toBe('en')
    expect(CATALOG_FALLBACK_LANGUAGE).toBe('en')
  })

  it('charge une langue et ne répond que dans celle-là', async () => {
    const [french, german, english] = await Promise.all([
      loadWidgetCatalog('fr'),
      loadWidgetCatalog('de'),
      loadWidgetCatalog('en')
    ])
    expect(french.language).toBe('fr')
    expect(german.language).toBe('de')
    expect(english.language).toBe('en')
    expect(french.widgetDescription('WStatusLine')).toBe('Etat du GPS et de la batterie')
    expect(german.widgetDescription('WStatusLine')).toBe('GPS- und Batteriestatus')
    expect(english.widgetDescription('WStatusLine')).toBe('GPS and battery status')
    expect(french.familyLabel('wgFlying')).toBe('En vol')
    expect(german.familyLabel('wgFlying')).toBe('Flug')
  })

  it('sert l’anglais pour une langue que le catalogue ne porte pas', async () => {
    const unknown = await loadWidgetCatalog('xx')
    expect(unknown.language).toBe('en')
    expect(unknown.widgetDescription('WStatusLine')).toBe('GPS and battery status')
    expect(unknown.familyLabel('wgFlying')).toBe('Flying')
    expect(unknown.catalogText('wStatusLineDescription')).toBe('GPS and battery status')
  })

  it('complète en anglais une langue partiellement traduite', async () => {
    // `hr` ne traduit que 16 des 172 ressources du catalogue — 4 descriptions sur 75.
    // Sans le repli anglais fusionné dans son fichier, la palette croate serait vide.
    const croatian = await loadWidgetCatalog('hr')
    expect(croatian.language).toBe('hr')
    expect(croatian.nativeStringCount).toBe(16)
    expect(croatian.fallbackStringCount).toBe(156)
    // Ce qu'elle traduit vraiment reste croate…
    expect(croatian.widgetDescription('WSpeed')).toBe('Trenutacna brzina')
    expect(croatian.widgetDescription('WButtonVario')).toBe(
      'Iskljuci / ukljuci vario i slabo dizanje'
    )
    // …et tout le reste tombe sur l'anglais, texte pour texte.
    expect(croatian.widgetDescription('WStatusLine')).toBe('GPS and battery status')
    expect(croatian.widgetDescription('WCompass')).toBe(
      'Graphical display of current heading direction, wind and navigation'
    )
    // Y compris les libellés de famille : `hr` n'en traduit que six sur onze.
    expect(croatian.familyLabel('wgNavigation')).toBe('Navigacija')
    expect(croatian.familyLabel('wgButtons')).toBe('Action buttons')
  })

  it('livre un fichier pour chacune des langues annoncées, et pas un de plus', async () => {
    const catalogs = await Promise.all(CATALOG_LANGUAGES.map((code) => loadWidgetCatalog(code)))
    expect(catalogs.map((catalog) => catalog.language)).toEqual([...CATALOG_LANGUAGES])
    for (const catalog of catalogs) {
      // La liste servant à choisir le fichier ne doit jamais diverger de celle que
      // les fichiers déclarent : elles sortent du même script, elles doivent coïncider.
      expect(catalog.meta.languages, catalog.language).toEqual([...CATALOG_LANGUAGES])
      // Aucune langue ne perd de texte : traduits + empruntés couvrent les 172 clés.
      expect(catalog.nativeStringCount + catalog.fallbackStringCount, catalog.language).toBe(172)
      // Et aucune ne perd sa description en route, quelle que soit sa couverture.
      for (const family of catalog.visibleFamilies()) {
        for (const name of family.widgets) {
          expect(catalog.widgetDescription(name), `${catalog.language}/${name}`).toBeDefined()
        }
      }
    }
  })

  it('recopie une traduction vide plutôt que de la remplacer par l’anglais', async () => {
    // XCTrack livre `wCompTaskSummaryDescription` **vide** en bulgare, alors que
    // l'anglais la remplit. Le repli ne se déclenche pas : une chaîne vide est une
    // traduction, pas une absence. L'objectif reste de reproduire XCTrack tel qu'il
    // est — c'est la seule occurrence des 33 langues, et elle est conservée telle
    // quelle plutôt que « réparée ».
    const bulgarian = await loadWidgetCatalog('bg')
    expect(bulgarian.widgetDescription('WCompTaskSummary')).toBe('')
    expect((await loadWidgetCatalog('en')).widgetDescription('WCompTaskSummary')).toBe(
      'Task information reminder'
    )
  })

  it('ne charge qu’une fois une même langue', async () => {
    const first = await loadWidgetCatalog('fr')
    const second = await loadWidgetCatalog('fr')
    expect(second).toBe(first)
    // Une langue absente et l'anglais désignent le même fichier, donc le même objet.
    expect(await loadWidgetCatalog('xx')).toBe(await loadWidgetCatalog('en'))
  })
})
