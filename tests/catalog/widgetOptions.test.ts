import { describe, expect, it } from 'vitest'
import {
  OPTION_LANGUAGES,
  WIDGET_OPTIONS,
  formatOptionLabel,
  labelCarriesValue,
  optionFor,
  optionHelp,
  optionLabel,
  optionValues,
  optionsFor,
  resourceText,
  unmatchedKeysFor
} from '../../src/catalog/widgetOptions'

/**
 * La référence de ces tests n'est pas le catalogue lui-même — ce serait tautologique —
 * mais le relevé du panneau natif fait sur un AIR³ 7.2, consigné dans
 * `docs/reference/edition-native.md` et `edition-native-exploration.md` § 4.3.
 * Les neuf libellés français ci-dessous ont été lus à l'écran de l'appareil.
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
  it('retrouve les neuf options de la boussole relevées sur l’appareil', () => {
    const keys = optionsFor('WCompass').map((option) => option.key)
    expect(keys).toHaveLength(9)
    expect(new Set(keys)).toEqual(new Set(BOUSSOLE_RELEVEE))
  })

  it('rend les libellés français exacts du panneau de la boussole', () => {
    const labels: Record<string, string> = {}
    for (const option of optionsFor('WCompass')) {
      labels[option.key] = optionLabel(option, 'fr')
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

  it('expose les quatre valeurs de windStyle, dans l’ordre du menu natif', () => {
    const windStyle = optionFor('WCompass', 'windStyle')
    expect(windStyle).toBeDefined()
    expect(windStyle?.control).toBe('enum')
    // Menu « Style d'indicateur de vent » ouvert sur l'appareil : Aucun, Flèche,
    // Arc, Manche à air — dans cet ordre.
    expect(optionValues(windStyle!, 'fr')).toEqual([
      { value: 'NONE', label: 'Aucun' },
      { value: 'ARROW', label: 'Flèche' },
      { value: 'ARC', label: 'Arc' },
      { value: 'WINDSOCK', label: 'Manche à air' }
    ])
    // Les noms de constantes sont ceux qu'écrit le fichier `.xcfg`.
    expect(optionValues(windStyle!, 'en').map((v) => v.value)).toEqual([
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
    const help = optionHelp(withHelp[0]!, 'fr')
    expect(help).toContain('direction du vent')
    expect(optionHelp(optionFor('WCompass', 'showHeading')!, 'fr')).toBeUndefined()
  })

  it('donne aux quatre valeurs de rotation les libellés relevés', () => {
    const rotation = optionFor('WCompass', 'rotation')!
    expect(optionValues(rotation, 'fr')).toEqual([
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
    expect(labelCarriesValue(bg, 'fr')).toBe(true)
    expect(formatOptionLabel(bg, 'fr', 100)).toBe("Transparence d'arrière-plan : 100%")
    expect(labelCarriesValue(optionFor('WCompass', 'showBearing')!, 'fr')).toBe(false)
  })

  it('retombe sur l’anglais quand la langue demandée manque', () => {
    const windStyle = optionFor('WCompass', 'windStyle')!
    expect(optionLabel(windStyle, 'xx')).toBe('Wind indicator style')
    expect(resourceText('widgetSettingsCompassWindStyle', 'xx')).toBe('Wind indicator style')
    expect(resourceText('cetteCleNExistePas', 'fr')).toBeUndefined()
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
      expect(WIDGET_OPTIONS.strings[option.label], `libellé de ${id}`).toBeDefined()
    }
    // Les options repérées sans libellé exploitable sont déclarées, pas escamotées.
    expect(WIDGET_OPTIONS.meta.unresolvedCount).toBe(WIDGET_OPTIONS.unresolved.length)
    for (const entry of WIDGET_OPTIONS.unresolved) {
      expect(entry.reason).toBeTruthy()
    }
  })
})
