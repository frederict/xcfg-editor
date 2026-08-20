import { beforeAll, describe, expect, it } from 'vitest'
import {
  OPTION_FALLBACK_LANGUAGE,
  OPTION_LANGUAGES,
  WIDGET_OPTIONS,
  loadWidgetOptions,
  optionFor,
  optionsFor,
  optionsLanguage,
  unmatchedKeysFor,
  type WidgetOptionTexts
} from '../../src/catalog/widgetOptions'
import { CATALOG_LANGUAGES } from '../../src/catalog/widgetCatalog'

/**
 * La référence de ces tests n'est pas le catalogue lui-même — ce serait tautologique —
 * mais le relevé du panneau natif fait sur un AIR³ 7.2, consigné dans
 * `docs/reference/edition-native.md` et `edition-native-exploration.md` § 4.3.
 * Les neuf libellés français ci-dessous ont été lus à l'écran de l'appareil.
 *
 * Depuis la partition par langue, ils vérifient en plus que **chaque** fichier de
 * langue est chargeable et qu'il porte bien le repli anglais : sans lui, `hi`
 * n'afficherait que 4 libellés sur 248.
 */
const BOUSSOLE_RELEVEE: readonly string[] = [
  '_border',
  '_bg',
  '_theme',
  'rotation',
  'navigation_target',
  'windStyle',
  'showHeading',
  'showBearing',
  'showBackground'
]

describe('catalogue des options de widgets', () => {
  /** Les libellés français, chargés une fois : la langue est portée par l'objet. */
  let fr: WidgetOptionTexts

  beforeAll(async () => {
    fr = await loadWidgetOptions('fr')
  })

  it('retrouve les neuf options de la boussole relevées sur l’appareil', () => {
    const keys = optionsFor('WCompass').map((option) => option.key)
    expect(keys).toHaveLength(9)
    expect(new Set(keys)).toEqual(new Set(BOUSSOLE_RELEVEE))
  })

  it('rend les libellés français exacts du panneau de la boussole', () => {
    const labels: Record<string, string> = {}
    for (const option of optionsFor('WCompass')) {
      labels[option.key] = fr.optionLabel(option)
    }
    expect(labels._border).toBe('Tracer frontière')
    // L'espace avant le deux-points est insécable dans les ressources de XCTrack.
    expect(labels._bg).toBe("Transparence d'arrière-plan : %d%%")
    expect(labels._theme).toBe('Affichage du thème')
    expect(labels.rotation).toBe('Rotation du compas')
    expect(labels.navigation_target).toBe('Afficher la flèche')
    expect(labels.windStyle).toBe("Style d'indicateur de vent")
    expect(labels.showHeading).toBe('Montrer la flèche de cap')
    expect(labels.showBearing).toBe('Montrer la flèche de trajectoire')
    expect(labels.showBackground).toBe("Afficher le cadran d'arrière-plan")
  })

  it('expose les quatre valeurs de windStyle, dans l’ordre du menu natif', async () => {
    const windStyle = optionFor('WCompass', 'windStyle')
    expect(windStyle).toBeDefined()
    expect(windStyle?.control).toBe('enum')
    // Menu « Style d'indicateur de vent » ouvert sur l'appareil : Aucun, Flèche,
    // Arc, Manche à air — dans cet ordre.
    expect(fr.optionValues(windStyle!)).toEqual([
      { value: 'NONE', label: 'Aucun' },
      { value: 'ARROW', label: 'Flèche' },
      { value: 'ARC', label: 'Arc' },
      { value: 'WINDSOCK', label: 'Manche à air' }
    ])
    // Les noms de constantes sont ceux qu'écrit le fichier `.xcfg`, quelle que soit
    // la langue chargée.
    const en = await loadWidgetOptions('en')
    expect(en.optionValues(windStyle!).map((value) => value.value)).toEqual([
      'NONE',
      'ARROW',
      'ARC',
      'WINDSOCK'
    ])
    expect(windStyle?.default).toBe('NONE')
  })

  it('n’attache un texte d’aide qu’aux options qui en ont un', () => {
    // Sur la boussole, seul `windStyle` porte le bouton `?`.
    const withHelp = optionsFor('WCompass').filter((option) => option.help !== undefined)
    expect(withHelp.map((option) => option.key)).toEqual(['windStyle'])
    const help = fr.optionHelp(withHelp[0]!)
    expect(help).toContain('direction du vent')
    expect(fr.optionHelp(optionFor('WCompass', 'showHeading')!)).toBeUndefined()
  })

  it('donne aux quatre valeurs de rotation les libellés relevés', () => {
    const rotation = optionFor('WCompass', 'rotation')!
    expect(fr.optionValues(rotation)).toEqual([
      { value: 'NORTH', label: 'Nord vers le haut' },
      { value: 'HEADING', label: 'Cap vers le haut' },
      { value: 'BEARING', label: 'Trajectoire en haut' },
      { value: 'TRAVEL_DIRECTION', label: 'Sens de déplacement en haut' }
    ])
    // Valeur par défaut d'une boussole neuve, relevée par export après création.
    expect(rotation.default).toBe('HEADING')
  })

  it('place les options universelles en tête, comme le panneau natif', () => {
    // `edition-native.md` : « _border, _bg et _theme apparaissent avant les options
    // propres au widget ».
    for (const widget of ['WCompass', 'WAltitude', 'WThermalAssistant']) {
      const keys = optionsFor(widget).map((option) => option.key)
      expect(keys.slice(0, 3).sort()).toEqual(['_bg', '_border', '_theme'])
    }
  })

  it('retrouve les huit contrôles du widget numérique Altitude GPS', () => {
    // `edition-native-exploration.md` § 4.3 : huit contrôles, dans cet ordre, dont
    // cinq partagés par tous les widgets numériques.
    expect(optionsFor('WAltitude').map((option) => option.key)).toEqual([
      '_bg',
      '_border',
      '_theme',
      '_title',
      'titletext',
      '_unit',
      '_hide_labels',
      '_units'
    ])
  })

  it('signale les clés composites et leurs sous-champs', () => {
    // `rotation` vaut `{value, showCompass}` sur un widget cartographique et une
    // simple chaîne sur la boussole : la forme dépend du widget, pas de la clé.
    const carte = optionFor('WThermalAssistant', 'rotation')!
    expect(carte.control).toBe('composite')
    expect(carte.fields).toEqual(['value', 'showCompass'])
    expect(optionFor('WCompass', 'rotation')!.control).toBe('enum')

    const echelle = optionFor('WThermalAssistant', 'mapScale')!
    expect(echelle.control).toBe('composite')
    expect(echelle.fields).toEqual(['value', 'auto', 'resetZoomPanExit'])
  })

  it('reconnaît un curseur dont le libellé porte la valeur', () => {
    const bg = optionFor('WCompass', '_bg')!
    expect(bg.control).toBe('slider')
    expect(fr.labelCarriesValue(bg)).toBe(true)
    expect(fr.formatOptionLabel(bg, 100)).toBe("Transparence d'arrière-plan : 100%")
    expect(fr.labelCarriesValue(optionFor('WCompass', 'showBearing')!)).toBe(false)
  })

  it('retombe sur l’anglais quand la langue demandée manque', async () => {
    // Le repli ne se fait plus texte par texte mais au choix du fichier : `xx` n'est
    // pas une langue du catalogue, on charge donc l'anglais.
    const inconnue = await loadWidgetOptions('xx')
    expect(inconnue.language).toBe('en')
    const windStyle = optionFor('WCompass', 'windStyle')!
    expect(inconnue.optionLabel(windStyle)).toBe('Wind indicator style')
    expect(inconnue.resourceText('widgetSettingsCompassWindStyle')).toBe('Wind indicator style')
    expect(fr.resourceText('cetteCleNExistePas')).toBeUndefined()
  })

  it('rend une liste vide pour un widget inconnu', () => {
    expect(optionsFor('WQuelqueChoseDeNouveau')).toEqual([])
    expect(optionFor('WCompass', 'cleInexistante')).toBeUndefined()
  })

  it('couvre les 37 types de widgets du corpus', () => {
    const corpus = [
      'WAirTime', 'WAirspaceProximity', 'WAltitude', 'WAltitudeAboveGround',
      'WButtonBrightness', 'WButtonNavig', 'WCompAltitudeOverGoal', 'WCompDistanceToGoal',
      'WCompGlideToGoal', 'WCompMap', 'WCompSpeedToStart', 'WCompTaskSummary',
      'WCompTimeAtStart', 'WCompTimeToStart', 'WCompass', 'WFL', 'WGlide', 'WLiveMessage',
      'WNextTurnpoint', 'WNextTurnpointAlt', 'WNextTurnpointDistance',
      'WNextTurnpointGlideTo', 'WNextTurnpointTimeOfArrival', 'WOptiResult',
      'WOptiUnfinishedTriangle', 'WSideView', 'WSpeed', 'WStatusLine', 'WThermalAltGain',
      'WThermalAssistant', 'WTime', 'WVarioColumn', 'WVerticalGraph', 'WVerticalSpeed',
      'WWindDirection', 'WWindSpeed', 'WXCAssistant'
    ]
    // `WCompTaskSummary` n'a aucune option propre et n'est donc décrit que par les
    // universelles ; tous les autres doivent être connus du catalogue.
    const inconnus = corpus.filter((widget) => optionsFor(widget).length === 0)
    expect(inconnus).toEqual([])
  })

  it('déclare les clés du corpus qu’il ne sait pas régler', () => {
    // `showWind` et `newWindArrow` sont des vestiges : XCTrack 1.0.3 les lit encore
    // mais ne les expose plus, `windStyle` les a remplacés. L'éditeur doit les
    // conserver à l'écriture sans savoir les présenter.
    expect(unmatchedKeysFor('WCompass')).toEqual(['newWindArrow', 'showWind'])
    expect(unmatchedKeysFor('WAltitude')).toEqual([])
    for (const [widget, keys] of Object.entries(WIDGET_OPTIONS.unmatchedCorpusKeys)) {
      const known = new Set(optionsFor(widget).map((option) => option.key))
      for (const key of keys) {
        expect(known.has(key), `${widget}.${key}`).toBe(false)
      }
    }
  })

  it('déclare ses langues et sa provenance', () => {
    expect(WIDGET_OPTIONS.meta.source).toMatch(/^XCTrack-/)
    expect(OPTION_LANGUAGES).toContain('fr')
    expect(OPTION_LANGUAGES).toContain('en')
    expect(OPTION_LANGUAGES.length).toBeGreaterThanOrEqual(34)
  })

  it('n’expose que des options dont le libellé est résolu, et liste les autres', () => {
    for (const [id, option] of Object.entries(WIDGET_OPTIONS.options)) {
      expect(option.label, `option ${id}`).toBeTruthy()
      expect(fr.resourceText(option.label), `libellé de ${id}`).toBeDefined()
    }
    // Les options repérées sans libellé exploitable sont déclarées, pas escamotées.
    expect(WIDGET_OPTIONS.meta.unresolvedCount).toBe(WIDGET_OPTIONS.unresolved.length)
    for (const entry of WIDGET_OPTIONS.unresolved) {
      expect(entry.reason).toBeTruthy()
    }
  })
})

describe('partition du catalogue d’options par langue', () => {
  it('choisit le fichier de la langue demandée, l’anglais à défaut', () => {
    expect(optionsLanguage('fr')).toBe('fr')
    expect(optionsLanguage('zh-TW')).toBe('zh-TW')
    // 'xx' n'existe dans aucune locale du catalogue.
    expect(optionsLanguage('xx')).toBe('en')
    // Limite connue, volontairement identique à celle de widgetNames.ts et
    // widgetCatalog.ts : la comparaison est exacte, `fr-FR` ne retombe pas sur `fr`.
    expect(optionsLanguage('fr-FR')).toBe('en')
    expect(OPTION_FALLBACK_LANGUAGE).toBe('en')
  })

  it('porte une langue de plus que le catalogue de la palette, et le sait', () => {
    // 34 ici contre 33 là-bas : XCTrack libelle des options en serbe sans décrire ses
    // widgets dans cette langue. Les deux listes ne doivent donc surtout pas être
    // confondues — c'est la raison pour laquelle chaque module porte la sienne.
    expect(OPTION_LANGUAGES).toContain('sr')
    expect(CATALOG_LANGUAGES).not.toContain('sr')
    expect(optionsLanguage('sr')).toBe('sr')
    // Hors le serbe, les deux catalogues couvrent exactement les mêmes langues.
    const surplus = OPTION_LANGUAGES.filter((code) => !CATALOG_LANGUAGES.includes(code))
    expect(surplus).toEqual(['sr'])
    expect(CATALOG_LANGUAGES.filter((code) => !OPTION_LANGUAGES.includes(code))).toEqual([])
  })

  it('charge une langue et ne répond que dans celle-là', async () => {
    const [french, german, english] = await Promise.all([
      loadWidgetOptions('fr'),
      loadWidgetOptions('de'),
      loadWidgetOptions('en')
    ])
    expect(french.language).toBe('fr')
    expect(german.language).toBe('de')
    expect(english.language).toBe('en')
    const windStyle = optionFor('WCompass', 'windStyle')!
    expect(french.optionLabel(windStyle)).toBe("Style d'indicateur de vent")
    expect(german.optionLabel(windStyle)).toBe('Stil der Windanzeige')
    expect(english.optionLabel(windStyle)).toBe('Wind indicator style')
    // Et les valeurs du menu déroulant suivent la même langue que son intitulé.
    expect(french.optionValues(windStyle).map((value) => value.label)).toEqual([
      'Aucun', 'Flèche', 'Arc', 'Manche à air'
    ])
    expect(german.optionValues(windStyle).map((value) => value.label)).toEqual([
      'Keine', 'Pfeil', 'Bogen', 'Windsack'
    ])
  })

  it('sert l’anglais pour une langue que le catalogue ne porte pas', async () => {
    const inconnue = await loadWidgetOptions('xx')
    expect(inconnue.language).toBe('en')
    expect(inconnue.resourceText('widgetSettingsDrawBorder')).toBe('Draw border')
    expect(inconnue.fallbackStringCount).toBe(0)
  })

  it('complète en anglais une langue partiellement traduite', async () => {
    // `hr` ne traduit que 40 des 248 ressources d'options. Sans le repli anglais
    // fusionné dans son fichier, le panneau croate serait vide aux quatre cinquièmes.
    const croate = await loadWidgetOptions('hr')
    expect(croate.language).toBe('hr')
    expect(croate.nativeStringCount).toBe(40)
    expect(croate.fallbackStringCount).toBe(208)
    // Ce qu'elle traduit vraiment reste croate…
    expect(croate.resourceText('widgetSettingsDrawBorder')).toBe('Nacrtaj granicu')
    // …et tout le reste tombe sur l'anglais, texte pour texte.
    const windStyle = optionFor('WCompass', 'windStyle')!
    expect(croate.optionLabel(windStyle)).toBe('Wind indicator style')
    expect(croate.optionHelp(windStyle)).toBe(
      (await loadWidgetOptions('en')).optionHelp(windStyle)
    )
  })

  it('livre un fichier pour chacune des langues annoncées, et pas un de plus', async () => {
    const sets = await Promise.all(OPTION_LANGUAGES.map((code) => loadWidgetOptions(code)))
    expect(sets.map((texts) => texts.language)).toEqual([...OPTION_LANGUAGES])
    // La liste servant à choisir le fichier ne doit jamais diverger de celle que la
    // part invariante déclare : elles sortent du même script, elles doivent coïncider.
    expect(WIDGET_OPTIONS.meta.languages).toEqual([...OPTION_LANGUAGES])
    for (const texts of sets) {
      // Aucune langue ne perd de texte : traduits + empruntés couvrent les 248 clés.
      expect(texts.nativeStringCount + texts.fallbackStringCount, texts.language)
        .toBe(WIDGET_OPTIONS.meta.stringCount)
      // Et aucune ne laisse une option sans libellé, quelle que soit sa couverture.
      // `toBeDefined` et non `toBeTruthy` : une traduction peut être vide, et l'être
      // volontairement — voir le test suivant.
      for (const [id, option] of Object.entries(WIDGET_OPTIONS.options)) {
        expect(texts.resourceText(option.label), `${texts.language}/${id}`).toBeDefined()
      }
    }
  })

  it('recopie une traduction vide plutôt que de la remplacer par l’anglais', async () => {
    // XCTrack livre `widgetSettingsShowNearInside` **vide** en bulgare, alors que
    // l'anglais la remplit. Le repli ne se déclenche pas : une chaîne vide est une
    // traduction, pas une absence. L'objectif reste de reproduire XCTrack tel qu'il
    // est — c'est la seule occurrence des 34 langues, et elle est conservée telle
    // quelle plutôt que « réparée ». Même constat que sur le catalogue de la palette.
    const bulgare = await loadWidgetOptions('bg')
    expect(bulgare.resourceText('widgetSettingsShowNearInside')).toBe('')
    expect((await loadWidgetOptions('en')).resourceText('widgetSettingsShowNearInside')).toBe(
      'Show near airspace while being inside another'
    )
    // Et le panneau affiche alors un intitulé vide, pas la clé de ressource : c'est
    // bien ce que fait XCTrack.
    const option = optionFor('WAirspaceProximity', '_shownearinside')!
    expect(bulgare.optionLabel(option)).toBe('')
  })

  it('ne charge qu’une fois une même langue', async () => {
    const first = await loadWidgetOptions('fr')
    const second = await loadWidgetOptions('fr')
    expect(second).toBe(first)
    // Une langue absente et l'anglais désignent le même fichier, donc le même objet.
    expect(await loadWidgetOptions('xx')).toBe(await loadWidgetOptions('en'))
  })

  it('garde hors des fichiers de langue tout ce qui n’est pas traduit', async () => {
    // La part invariante — 225 options, 84 widgets, les non-résolues — ne doit être
    // recopiée dans aucun fichier de langue : c'est elle qui pesait, et la dupliquer
    // 34 fois annulerait le partage.
    const raw = (await import('../../src/catalog/widgetOptions/fr.json')).default
    expect(Object.keys(raw).sort()).toEqual([
      'fallbackLanguage', 'fallbackStringCount', 'language', 'nativeStringCount', 'strings'
    ])
    expect(WIDGET_OPTIONS.options).toBeDefined()
    expect(Object.keys(WIDGET_OPTIONS.widgets)).toHaveLength(WIDGET_OPTIONS.meta.widgetCount)
  })
})
