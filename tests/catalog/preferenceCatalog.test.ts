import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  PREFERENCE_FALLBACK_LANGUAGE,
  PREFERENCE_LANGUAGES,
  loadPreferenceCatalog,
  preferenceLanguage,
  type PreferenceCatalog
} from '../../src/catalog/preferenceCatalog'
import { BACKUP_2025, BACKUP_2026 } from '../fixtures/paths'

/**
 * La référence de ces tests n'est pas le catalogue lui-même — ce serait tautologique —
 * mais **deux sources indépendantes de l'APK** :
 *
 * 1. **Les écrans de l'appareil.** Relevé sur l'AIR³ 7.2 branché, XCTrack 1.0.3-beta5 en
 *    français, le 21 août 2026 : l'écran racine des préférences et l'écran « Vol de
 *    distance et compétition », lignes et catégorie comprises. C'est le binaire contre la
 *    vitre.
 * 2. **Les fichiers réels**, anonymisés dans `tests/fixtures/exports/`. Un `backup` écrit
 *    par XCTrack 1.0.3-beta porte 136 clés de préférence : le catalogue doit toutes les
 *    connaître, et les déclarer exportables. Celui de 0.9.12.3 en porte 148, dont 27 que
 *    la version courante ne connaît plus — c'est la mesure de ce que coûterait l'absence
 *    d'une dimension « version », et elle est vérifiée plutôt qu'affirmée.
 */

/**
 * Écran racine, relevé sur l'appareil : les neuf premières lignes visibles sans
 * défilement, dans l'ordre, avec leur libellé français.
 */
const DEVICE_ROOT_SCREEN: ReadonlyArray<readonly [string, string]> = [
  ['_pilot', 'Pilote et comptes'],
  ['_glider', 'Aéronef'],
  ['_livetracking', 'Livetracking'],
  ['_contest', 'Vol de distance et compétition'],
  ['_sensorsQnh', 'Paramétrages altimètre/QNH'],
  ['_airspaces', 'Espaces aériens et obstacles'],
  ['_maps', 'Cartes'],
  ['_sound', 'Son et alertes'],
  ['_display', 'Affichage']
]

/**
 * Écran « Vol de distance et compétition », relevé sur l'appareil : quatre réglages et
 * la catégorie qui coiffe les trois derniers. Les valeurs affichées (`20,0 %`,
 * `1,00 points/km`, `1.20` dans la boîte d'édition) confirment au passage le nombre de
 * décimales lu dans l'écran XML.
 */
const DEVICE_CONTEST_SCREEN: ReadonlyArray<readonly [string, string, number]> = [
  ['Contest.TriangleClosing', 'Distance triangle fermé', 1],
  ['Contest.CoefVP5', 'Vol par 3 balises', 2],
  ['Contest.CoefPT', 'Triangle plat', 2],
  ['Contest.CoefFT', 'Triangle FAI', 2]
]

function preferenceKeys(path: string): string[] {
  const document = JSON.parse(readFileSync(path, 'utf8')) as { preferences: Record<string, unknown> }
  return Object.keys(document.preferences)
}

describe('catalogue des préférences', () => {
  let fr: PreferenceCatalog
  let en: PreferenceCatalog

  beforeAll(async () => {
    fr = await loadPreferenceCatalog('fr')
    en = await loadPreferenceCatalog('en')
  })

  describe("l'écran racine, tel que l'appareil l'affiche", () => {
    it("porte les neuf premières lignes dans l'ordre et avec le libellé français", () => {
      const screen = fr.screen('preferences')
      expect(screen).toBeDefined()
      const observed = screen!.rows
        .slice(0, DEVICE_ROOT_SCREEN.length)
        .map((row) => [row.key, row.title === undefined ? row.titleText : fr.text(row.title)])
      expect(observed).toEqual(DEVICE_ROOT_SCREEN.map(([key, label]) => [key, label]))
    })

    it('ne règle aucune valeur : chaque ligne ouvre un écran ou une activité', () => {
      const screen = fr.screen('preferences')!
      for (const [key] of DEVICE_ROOT_SCREEN) {
        const row = screen.rows.find((candidate) => candidate.key === key)
        expect(row?.opens, key).toBeDefined()
      }
    })
  })

  describe("l'écran des compétitions, tel que l'appareil l'affiche", () => {
    it('porte les quatre réglages, leur libellé français et leur nombre de décimales', () => {
      for (const [key, label, decimals] of DEVICE_CONTEST_SCREEN) {
        const entry = fr.preference(key)
        expect(entry, key).toBeDefined()
        expect(fr.label(key)).toBe(label)
        expect(entry!.decimals, key).toBe(decimals)
        expect(entry!.screen, key).toBe('preferences_contest')
      }
    })

    it('range les trois facteurs sous la catégorie « Facteurs de la discipline »', () => {
      for (const key of ['Contest.CoefVP5', 'Contest.CoefPT', 'Contest.CoefFT']) {
        expect(fr.preference(key)?.category, key).toBe('_contestCoef')
      }
      // La catégorie est une ligne de l'écran : son libellé se lit comme les autres.
      const category = fr.screen('preferences_contest')!.rows
        .find((row) => row.key === '_contestCoef')
      expect(category?.tag).toBe('PreferenceCategory')
      expect(fr.text(category!.title!)).toBe('Facteurs de la discipline')
    })

    it("le défaut du bytecode est celui que l'appareil affiche", () => {
      // Relevé écran : 20,0 % / 1,00 / 1.20 — le fichier de l'appareil porte ces
      // valeurs-là, qui sont aussi les défauts de XCTrack.
      expect(fr.preference('Contest.TriangleClosing')?.default).toBe(20)
      expect(fr.preference('Contest.CoefVP5')?.default).toBe(1)
      expect(fr.preference('Contest.CoefPT')?.default).toBe(1.2)
    })
  })

  describe('confrontation aux fichiers réels', () => {
    it('connaît les 136 clés du backup 1.0.3-beta, sans exception', () => {
      const keys = preferenceKeys(BACKUP_2026)
      expect(keys).toHaveLength(136)
      const unknown = keys.filter((key) => !fr.knows(key))
      expect(unknown).toEqual([])
    })

    it('les déclare toutes exportables — aucune clé du fichier ne devrait être interne', () => {
      const keys = preferenceKeys(BACKUP_2026)
      const notExported = keys.filter((key) => !fr.isExported(key))
      expect(notExported).toEqual([])
    })

    it('les 135 clés PUBLIC du bytecode sont exactement celles du fichier, moins une', () => {
      // Le contrôle croisé central de l'extraction. Une clé `PUBLIC` de plus voudrait
      // dire qu'on a lu une portée pour une autre ; une de moins, qu'on en a manqué une.
      // La 136ᵉ du fichier est `SafeSky.Interval`, qu'Android persiste depuis l'écran
      // sans passer par la classe de configuration : elle n'a donc pas de portée.
      const declaredPublic = fr.keys()
        .filter((key) => fr.preference(key)?.scope === 'PUBLIC').sort()
      const inFile = [...preferenceKeys(BACKUP_2026)].sort()
      expect(declaredPublic).toHaveLength(135)
      expect(inFile.filter((key) => !declaredPublic.includes(key))).toEqual(['SafeSky.Interval'])
      expect(declaredPublic.filter((key) => !inFile.includes(key))).toEqual([])
    })

    it('les six clés exportables absentes du fichier sont nommées, et explicables', () => {
      // `isExported` est une **possibilité** pour une clé qu'Android persiste seul : elle
      // n'atterrit dans un fichier qu'une fois écrite. Ces six-là ne l'ont jamais été sur
      // l'appareil de référence — les trois `Devel.*` et `Internal.FlarmDbVisited` vivent
      // dans les écrans cachés « - extra - » et « - development - », et les deux `_tts*`
      // sont des lignes d'écran qui recopient `Sound.TTS.Speed` et `Sound.TTS.Pitch`.
      const exportable = fr.keys().filter((key) => fr.isExported(key))
      const inFile = new Set(preferenceKeys(BACKUP_2026))
      expect(exportable.filter((key) => !inFile.has(key)).sort()).toEqual([
        'Devel.TAShowWindLines',
        'Devel.TTS',
        'Devel.TTSAbbr',
        'Internal.FlarmDbVisited',
        '_ttsPitch',
        '_ttsSpeed'
      ])
      // Aucune des six n'est déclarée par la classe de configuration : c'est ce drapeau
      // qui permet à une interface de les écarter d'une page de réglages.
      for (const key of exportable.filter((candidate) => !inFile.has(candidate))) {
        expect(fr.preference(key)?.declared, key).toBe(false)
      }
    })

    it('marque comme inconnues les 27 clés que 0.9.12.3 écrivait et que 1.0.3 ne connaît plus', () => {
      const keys = preferenceKeys(BACKUP_2025)
      expect(keys).toHaveLength(148)
      const unknown = keys.filter((key) => !fr.knows(key))
      // Sons individuels, étiquettes d'événements d'espace aérien, ancien
      // `EventMapping` : XCTrack les a regroupés ou renommés depuis.
      expect(unknown).toHaveLength(27)
      expect(unknown).toContain('EventMapping')
      expect(unknown).toContain('Tweak.EnableHWAccel')
      // Et le catalogue ne prétend surtout pas qu'elles sont supprimables : `knows()`
      // rend faux, ce qui veut dire « je ne sais pas », pas « elle n'existe pas ».
      expect(fr.preference('EventMapping')).toBeUndefined()
    })

    it('une clé inconnue ne se dit pas exportable', () => {
      expect(fr.isExported('Clef.Inventee')).toBe(false)
      expect(fr.knows('Clef.Inventee')).toBe(false)
    })
  })

  describe('la couverture, chiffrée', () => {
    it('a lu les deux sources et ne les a pas laissées se contredire sur les valeurs', () => {
      expect(fr.meta.valueConflicts).toEqual([])
    })

    it('publie les deux désaccords de défaut plutôt que de les taire', () => {
      // Ce sont deux contradictions de XCTrack lui-même : l'écran et la classe de
      // configuration ne donnent pas le même défaut. `default` retient celui du
      // bytecode, qui fait foi à la lecture, et `xmlDefault` garde l'autre.
      expect(fr.meta.defaultConflicts).toEqual([
        'Display.WidgetTitleOutlineColor',
        'Sensors.ManualQnh'
      ])
      expect(fr.preference('Sensors.ManualQnh')?.default).toBe(1013)
      expect(fr.preference('Sensors.ManualQnh')?.xmlDefault).toBe(1013.25)
    })

    it("compte 85 clés sans libellé, et dit lesquelles plutôt que d'en inventer", () => {
      expect(fr.unlabelled()).toHaveLength(85)
      // Les espaces aériens se règlent dans une activité à eux, qui construit ses
      // contrôles en code : la clé et son libellé n'y sont plus arguments du même appel.
      expect(fr.unlabelled()).toContain('Airspace.LabelsZoom')
      expect(fr.hasLabel('Airspace.LabelsZoom')).toBe(false)
      // Faute de libellé, on affiche la clé — jamais un texte inventé.
      expect(fr.label('Airspace.LabelsZoom')).toBe('Airspace.LabelsZoom')
    })

    it('49 des 136 clés du fichier réel sont sans libellé, 87 en ont un', () => {
      const keys = preferenceKeys(BACKUP_2026)
      const labelled = keys.filter((key) => fr.hasLabel(key))
      expect(labelled).toHaveLength(87)
      expect(keys.length - labelled.length).toBe(49)
    })

    it('sait dire de quelle version il parle', () => {
      expect(fr.meta.versionCode).toBe(100030)
      expect(fr.meta.versionName).toBe('1.0.3-beta-5-gc036d8f2c')
      expect(fr.meta.package).toBe('org.xcontest.XCTrack')
    })
  })

  describe('les valeurs permises', () => {
    it("suivent l'ordre de l'écran, pas celui des ordinaux de l'énumération", () => {
      // Le piège : les deux listes portent les mêmes cinq valeurs dans un ordre
      // différent. Prendre celui du bytecode collerait « Paysage » sur `PORTRAIT`.
      const entry = fr.preference('Display.Orientation')!
      expect(entry.valuesSource).toBe('entryValues')
      expect(entry.values).toEqual(['SENSOR', 'PORTRAIT', 'LANDSCAPE', 'REVERSE_PORTRAIT',
        'REVERSE_LANDSCAPE'])
      expect(entry.enumValues).toEqual(['SENSOR', 'LANDSCAPE', 'PORTRAIT', 'REVERSE_LANDSCAPE',
        'REVERSE_PORTRAIT'])
      expect(fr.values('Display.Orientation')).toEqual([
        { value: 'SENSOR', label: 'Automatique' },
        { value: 'PORTRAIT', label: 'Portrait' },
        { value: 'LANDSCAPE', label: 'Paysage' },
        { value: 'REVERSE_PORTRAIT', label: 'Portrait inversé' },
        { value: 'REVERSE_LANDSCAPE', label: 'Paysage inversé' }
      ])
    })

    it('portent le nom écrit dans le fichier, et le libellé traduit', () => {
      expect(fr.values('Display.Theme')).toEqual([
        { value: 'BlackTheme', label: 'Noir' },
        { value: 'BlackHCTheme', label: 'Haut contraste noir' },
        { value: 'WhiteTheme', label: 'Blanc' },
        { value: 'WhiteHCTheme', label: 'Haut contraste blanc' },
        { value: 'WhiteEInkTheme', label: 'E-ink blanc' }
      ])
    })

    it("rendent le nom de la constante quand aucun écran ne l'affiche", () => {
      // `LandingDetectionType` se règle dans « Actions automatiques », un écran construit
      // en code. Le domaine de valeurs vient donc de l'énumération, sans libellés.
      const entry = fr.preference('LandingDetectionType')!
      expect(entry.valuesSource).toBe('enum')
      expect(fr.values('LandingDetectionType')).toEqual([
        { value: 'LANDING_AUTOMATIC', label: 'LANDING_AUTOMATIC' },
        { value: 'LANDING_MANUAL', label: 'LANDING_MANUAL' },
        { value: 'LANDING_NODETECTION', label: 'LANDING_NODETECTION' }
      ])
    })

    it('chaque valeur de chaque liste a autant de libellés que de valeurs', () => {
      // Un décalage d'un cran passerait inaperçu à l'œil et donnerait un réglage faux.
      for (const key of fr.keys()) {
        const entry = fr.preference(key)!
        if (entry.entryLabels === undefined) continue
        const resolved = fr.values(key)
        expect(resolved.length, key).toBe(entry.values?.length ?? 0)
        // Un libellé égal à sa propre valeur signalerait un tableau plus court que la
        // liste — sauf pour `Display.WidgetTitleFont`, dont XCTrack libelle bel et bien
        // la valeur `normal` par le mot « normal » en anglais.
        if (key === 'Display.WidgetTitleFont') continue
        for (const item of resolved) {
          expect(item.label, `${key} / ${item.value}`).not.toBe(item.value)
        }
      }
    })

    it("la valeur d'un fichier réel fait partie du domaine, quand le domaine est connu", () => {
      const document = JSON.parse(readFileSync(BACKUP_2026, 'utf8')) as {
        preferences: Record<string, unknown>
      }
      const offenders: string[] = []
      for (const [key, value] of Object.entries(document.preferences)) {
        const entry = fr.preference(key)
        if (entry?.values === undefined || typeof value !== 'string') continue
        if (!entry.values.includes(value)) offenders.push(`${key}=${value}`)
      }
      // `Display.Language` vaut `''` dans le fichier — la langue système — et `''` est
      // bien la première valeur permise. Rien ne doit dépasser.
      expect(offenders).toEqual([])
    })
  })

  describe('les données personnelles', () => {
    it('marque les clés qui portent le pilote, son matériel et ses fichiers', () => {
      for (const key of ['Pilot.Name', 'Glider.Name', 'Sensors.Configuration',
        'Navigation.WaypointFiles', 'Airspace.Files', 'Mapsforge.ThemeFile']) {
        expect(fr.preference(key)?.personal, key).toBeDefined()
      }
    })

    it("dit sur quelle base : lue dans l'APK, ou déclarée", () => {
      // Portée `SECURE` : lu dans le bytecode.
      expect(fr.preference('XContest.AuthToken')?.personal).toEqual({
        kind: 'credential',
        basis: 'scope',
        reason: expect.stringContaining('SECURE')
      })
      // Contenu d'une clé : personne ne peut le lire dans l'APK, c'est une affirmation.
      expect(fr.preference('Pilot.Name')?.personal?.basis).toBe('declared')
    })

    it("signale la position présumée de l'appareil, que scope.ts ne connaît pas", () => {
      // `App.GuessLatitude` / `App.GuessLongitude` — en pratique le domicile du pilote.
      // Portée `INTERNAL` : elles ne sortent pas dans un export, et c'est la seule
      // raison pour laquelle personne ne s'en était inquiété.
      for (const key of ['App.GuessLatitude', 'App.GuessLongitude']) {
        expect(fr.preference(key)?.personal?.kind, key).toBe('location')
        expect(fr.preference(key)?.scope, key).toBe('INTERNAL')
        expect(fr.isExported(key), key).toBe(false)
      }
    })

    it("aucune clé secrète n'est exportable", () => {
      const secure = fr.keys().filter((key) => fr.preference(key)?.scope === 'SECURE')
      expect(secure.length).toBeGreaterThan(0)
      expect(secure.filter((key) => fr.isExported(key))).toEqual([])
    })
  })

  describe('la partition par langue', () => {
    it('livre 35 langues, anglais compris', () => {
      expect(PREFERENCE_LANGUAGES).toContain(PREFERENCE_FALLBACK_LANGUAGE)
      expect(PREFERENCE_LANGUAGES).toContain('fr')
      expect(PREFERENCE_LANGUAGES.length).toBe(fr.meta.languages.length)
    })

    it("retombe sur l'anglais pour une langue absente, y compris régionalisée", () => {
      expect(preferenceLanguage('fr')).toBe('fr')
      expect(preferenceLanguage('fr-FR')).toBe(PREFERENCE_FALLBACK_LANGUAGE)
      expect(preferenceLanguage('kl')).toBe(PREFERENCE_FALLBACK_LANGUAGE)
    })

    it('mémorise le chargement : deux appels rendent le même objet', async () => {
      const again = await loadPreferenceCatalog('fr')
      expect(again).toBe(fr)
      expect(await loadPreferenceCatalog('kl')).toBe(en)
    })

    it('chaque langue est chargeable et porte tous les textes, repli fusionné', async () => {
      const expected = fr.meta.stringCount
      for (const language of PREFERENCE_LANGUAGES) {
        const catalog = await loadPreferenceCatalog(language)
        expect(catalog.language, language).toBe(language)
        const total = catalog.nativeStringCount + catalog.fallbackStringCount
        expect(total, language).toBe(expected)
        // Le repli n'est pas décoratif : sans lui, ces langues afficheraient du vide.
        expect(catalog.text('prefDisplayTheme'), language).toBeDefined()
        expect(catalog.values('Display.Theme').length, language).toBe(5)
      }
    })

    it("l'anglais est la seule langue à ne rien emprunter", () => {
      expect(en.fallbackStringCount).toBe(0)
    })

    it("le repli rend le texte anglais, pas la clé ni du vide", async () => {
      // `hi` est l'une des langues les plus incomplètes du catalogue.
      const hi = await loadPreferenceCatalog('hi')
      expect(hi.fallbackStringCount).toBeGreaterThan(0)
      for (const key of hi.keys()) {
        if (!hi.hasLabel(key)) continue
        expect(hi.label(key), key).not.toBe('')
      }
    })
  })

  describe('les familles', () => {
    it('rangent chaque clé sous ce qui précède son premier point', () => {
      expect(fr.keysInFamily('Unit')).toHaveLength(8)
      expect(fr.keysInFamily('Keys')).toContain('Keys.MapPanStepSize')
      for (const family of fr.families()) {
        for (const key of fr.keysInFamily(family)) {
          expect(fr.preference(key)?.family, key).toBe(family)
        }
      }
    })

    it('mettent en dernier les clés sans point, qui n’ont pas de famille', () => {
      const families = fr.families()
      expect(families[families.length - 1]).toBe('')
      expect(fr.keysInFamily('')).toContain('TakeoffSpeed')
    })

    it('couvrent toutes les clés, sans doublon', () => {
      const grouped = fr.families().flatMap((family) => [...fr.keysInFamily(family)])
      expect(grouped.sort()).toEqual([...fr.keys()].sort())
    })
  })

  describe("les écrans, tels que l'APK les déclare", () => {
    it('sont vingt, dont la racine', () => {
      expect(fr.screens).toHaveLength(20)
      expect(fr.screen('preferences')).toBeDefined()
      expect(fr.screen('preferences_display')).toBeDefined()
      expect(fr.screen('inexistant')).toBeUndefined()
    })

    it("chaque ligne d'écran qui règle une valeur est au catalogue", () => {
      const orphans: string[] = []
      for (const screen of fr.screens) {
        for (const row of screen.rows) {
          if (row.key === undefined) continue
          if (row.tag === 'PreferenceCategory' || row.opens !== undefined) continue
          if (row.tag === 'Preference' || row.tag.endsWith('ButtonPreference')) continue
          if (!fr.knows(row.key)) orphans.push(`${screen.id}/${row.key}`)
        }
      }
      expect(orphans).toEqual([])
    })

    it("une préférence qui cite un écran est bien dans cet écran", () => {
      for (const key of fr.keys()) {
        const entry = fr.preference(key)!
        if (entry.screen === undefined) continue
        const screen = fr.screen(entry.screen)
        expect(screen, key).toBeDefined()
        expect(screen!.rows.some((row) => row.key === key), key).toBe(true)
      }
    })
  })
})
