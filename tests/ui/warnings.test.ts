import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import CATALOG from '../../src/catalog/widgetCatalog/en.json'
import { parseJson } from '../../src/core/parseJson'
import type { JsonNode } from '../../src/core/jsonDocument'
import { readLayout } from '../../src/model/layout'
import { readRenderSettings } from '../../src/model/preferences'
import {
  REFERENCE_VERSION_CODE,
  computeWarnings,
  isActionButton,
  warningsAt,
  type Warning,
  type WarningKind
} from '../../src/ui/warnings'
import { EXPORTS } from '../fixtures/paths'

const CORPUS = [
  '2026-08-20_backup-00.xcfg',
  '2026-08-20_pages-00.xcfg',
  'backup.xcfg',
  '2025-07-07_backup-00.xcfg',
  '2025-07-07_pages-00.xcfg'
]

function warningsOfFile(name: string): Warning[] {
  return warningsOf(parseJson(readFileSync(EXPORTS + name, 'utf8')))
}

function warningsOf(document: JsonNode, language = 'fr'): Warning[] {
  return computeWarnings({
    document,
    layout: readLayout(document),
    settings: readRenderSettings(document),
    language
  })
}

function kinds(warnings: Warning[]): WarningKind[] {
  return warnings.map((warning) => warning.kind)
}

function pick(warnings: Warning[], kind: WarningKind): Warning | undefined {
  return warnings.find((warning) => warning.kind === kind)
}

/** Tout le texte d'un avertissement, titre, explication et détails confondus. */
function textOf(warning: Warning | undefined): string {
  if (!warning) return ''
  return [warning.title, warning.detail, ...warning.items].join('\n')
}

/** Document fabriqué : une seule page paysage portant les widgets donnés. */
function documentWith(widgets: string[], pageExtras = '"navigations": "all"'): JsonNode {
  return parseJson(`{
    "info": { "device": "AIR3 AIR3-7.2 8.1.0", "exportType": "pages", "versionCode": ${REFERENCE_VERSION_CODE} },
    "layout": {
      "landscape": [
        {
          "CLASS": "org.xcontest.XCTrack.page.WPEmpty",
          ${pageExtras},
          "widgets": [${widgets.join(',')}]
        }
      ],
      "portrait": []
    }
  }`)
}

/**
 * Widget complet : les huit clés universelles, pour n'éveiller que le défaut visé.
 *
 * `WAltitude` est un widget d'**affichage** : recouvert, il constitue un vrai défaut.
 * Pour l'autre versant de la distinction, voir `button` juste en dessous.
 */
function widget(x1: number, y1: number, x2: number, y2: number, background = 100): string {
  return `{
    "CLASS": "org.xcontest.XCTrack.widget.w.WAltitude",
    "X1": ${x1}, "Y1": ${y1}, "X2": ${x2}, "Y2": ${y2},
    "_border": true, "_bg": ${background}, "_theme": ""
  }`
}

/** Un widget de la famille « Boutons d'actions » — celui du montage du propriétaire. */
function button(
  x1: number, y1: number, x2: number, y2: number, shortName = 'WButtonBrightness'
): string {
  return `{
    "CLASS": "org.xcontest.XCTrack.widget.w.${shortName}",
    "X1": ${x1}, "Y1": ${y1}, "X2": ${x2}, "Y2": ${y2},
    "_border": true, "_bg": 100, "_theme": ""
  }`
}

describe('avertissements — type d’export', () => {
  it('distingue « pages » de « backup » par deux textes différents', () => {
    const pages = pick(warningsOfFile('2026-08-20_pages-00.xcfg'), 'export-type')
    const backup = pick(warningsOfFile('2026-08-20_backup-00.xcfg'), 'export-type')

    expect(pages).toBeDefined()
    expect(backup).toBeDefined()
    expect(pages?.title).not.toBe(backup?.title)
    expect(pages?.detail).not.toBe(backup?.detail)

    // Ce que le pilote doit comprendre : l'un ne touche que les écrans, l'autre écrase
    // aussi vario, unités, espaces aériens et capteurs.
    expect(textOf(pages)).toContain('écrans')
    expect(textOf(backup)).toMatch(/vario/i)
    expect(textOf(backup)).toMatch(/espace aérien/i)
    expect(textOf(backup)).toMatch(/capteurs/i)
  })
})

describe('avertissements — valeurs supposées', () => {
  it('signale les valeurs par défaut sur un export « pages »', () => {
    expect(kinds(warningsOfFile('2026-08-20_pages-00.xcfg'))).toContain('assumed-values')
  })

  it('ne les signale pas sur un « backup », qui porte ses préférences', () => {
    expect(kinds(warningsOfFile('2026-08-20_backup-00.xcfg'))).not.toContain('assumed-values')
  })

  it('signale une langue indéterminée quand Display.Language est vide', () => {
    // Les deux backups du corpus portent `Display.Language: ""` : XCTrack suit alors la
    // langue du système Android, jamais l'anglais.
    const warning = pick(warningsOfFile('2026-08-20_backup-00.xcfg'), 'assumed-language')
    expect(warning).toBeDefined()
    expect(textOf(warning)).toContain('fr')
  })

  it('signale une langue indéterminée quand la section preferences est absente', () => {
    expect(kinds(warningsOfFile('2025-07-07_pages-00.xcfg'))).toContain('assumed-language')
  })

  it('ne la signale pas quand le fichier déclare sa langue', () => {
    // complète.xcfg porte `Display.Language: "fr"`.
    expect(kinds(warningsOfFile('2025-07-07_backup-00.xcfg'))).not.toContain('assumed-language')
  })
})

describe('avertissements — données personnelles', () => {
  it('nomme le pilote, sa voile et ses fichiers de waypoints sur un backup', () => {
    const warning = pick(warningsOfFile('2026-08-20_backup-00.xcfg'), 'personal-data')
    const text = textOf(warning)
    expect(text).toContain('Pilot.Name')
    expect(text).toContain('Glider.Name')
    expect(text).toContain('Livetrack')
    expect(text).toContain('coupe-exemple-2026.CompeGPS.wpt')
  })

  it('ne dit rien d’un export « pages », qui ne porte aucune préférence', () => {
    expect(kinds(warningsOfFile('2026-08-20_pages-00.xcfg'))).not.toContain('personal-data')
  })

  it('se montre à l’export, pas à l’import', () => {
    const warnings = warningsOfFile('2026-08-20_backup-00.xcfg')
    expect(kinds(warningsAt(warnings, 'import'))).not.toContain('personal-data')
    expect(kinds(warningsAt(warnings, 'export'))).toEqual(['personal-data'])
  })
})

describe('avertissements — ressources externes', () => {
  it('liste le thème de carte et les waypoints d’un backup', () => {
    const warning = pick(warningsOfFile('2026-08-20_backup-00.xcfg'), 'external-resources')
    const text = textOf(warning)
    expect(text).toContain('hyperpilot/hyperpilot.xml')
    expect(text).toContain('cities5000-Exemple.wpt')
  })

  it('liste aussi les fichiers d’espace aérien quand il y en a', () => {
    // `Airspace.Files` est vide dans les backups récents, peuplé dans celui de 2025.
    const text = textOf(pick(warningsOfFile('2025-07-07_backup-00.xcfg'), 'external-resources'))
    expect(text).toContain('Exemple-Airspaces-2025_0.txt')
  })

  it('ne produit pas d’avertissement creux quand rien n’est référencé', () => {
    expect(kinds(warningsOfFile('2026-08-20_pages-00.xcfg'))).not.toContain('external-resources')

    // Un backup fabriqué dont Airspace.Files est vide et sans autre ressource.
    const document = parseJson(`{
      "info": { "exportType": "backup", "versionCode": ${REFERENCE_VERSION_CODE} },
      "preferences": { "Airspace.Files": [], "Display.Language": "fr" },
      "layout": { "landscape": [], "portrait": [] }
    }`)
    expect(kinds(warningsOf(document))).not.toContain('external-resources')
  })
})

describe('avertissements — écart de version', () => {
  it('signale complète.xcfg, exporté par la version 91230', () => {
    const warning = pick(warningsOfFile('2025-07-07_backup-00.xcfg'), 'version-gap')
    expect(warning).toBeDefined()
    expect(textOf(warning)).toContain('91230')
    expect(textOf(warning)).toContain(String(REFERENCE_VERSION_CODE))
  })

  it('ne signale rien quand le fichier est à la version de référence', () => {
    expect(kinds(warningsOfFile('2026-08-20_backup-00.xcfg'))).not.toContain('version-gap')
  })
})

describe('avertissements — structure inattendue', () => {
  it('ne se déclenche sur aucun fichier du corpus', () => {
    for (const name of CORPUS) {
      expect(kinds(warningsOfFile(name)), name).not.toContain('structure')
    }
  })

  it('signale une clé universelle absente', () => {
    const incomplete = `{
      "CLASS": "org.xcontest.XCTrack.widget.w.WAltitude",
      "Y1": 0, "X2": 5000, "Y2": 5000, "_border": true, "_bg": 100, "_theme": ""
    }`
    const warning = pick(warningsOf(documentWith([incomplete])), 'structure')
    expect(textOf(warning)).toContain('X1')
  })

  it('signale une classe de page absente', () => {
    const document = parseJson(`{
      "layout": { "landscape": [{ "navigations": "all", "widgets": [] }], "portrait": [] }
    }`)
    expect(textOf(pick(warningsOf(document), 'structure'))).toMatch(/ne dit pas son type/)
  })

  it('signale « navigations » d’un type non reconnu', () => {
    const document = documentWith([widget(0, 0, 5000, 5000)], '"navigations": 3')
    expect(textOf(pick(warningsOf(document), 'structure'))).toContain('navigations')
  })

  it('signale une clé dupliquée, que JSON.parse écraserait en silence', () => {
    const document = parseJson(`{
      "info": { "exportType": "pages", "versionCode": ${REFERENCE_VERSION_CODE} },
      "layout": { "landscape": [], "portrait": [] },
      "layout": { "landscape": [], "portrait": [] }
    }`)
    expect(textOf(pick(warningsOf(document), 'structure'))).toContain('layout')
  })
})

describe('avertissements — défauts géométriques', () => {
  it('signale X2 ≤ X1', () => {
    const text = textOf(pick(warningsOf(documentWith([widget(3000, 0, 3000, 5000)])), 'geometry'))
    expect(text).toContain('X2')
  })

  it('signale Y2 ≤ Y1', () => {
    const text = textOf(pick(warningsOf(documentWith([widget(0, 5000, 3000, 1000)])), 'geometry'))
    expect(text).toContain('Y2')
  })

  it('signale une coordonnée hors des bornes 0–10000', () => {
    const text = textOf(pick(warningsOf(documentWith([widget(0, 0, 12000, 5000)])), 'geometry'))
    expect(text).toMatch(/hors des bornes/)
    expect(text).toContain('12000')
  })

  /**
   * **« Opaque » se lit `_bg: 0`, pas `_bg: 100`.** Ces quatre cas affirmaient
   * l'inverse : ils passaient parce que le critère de `warnings.ts` était aligné sur
   * la même erreur, pas parce qu'ils décrivaient l'appareil. La mesure est
   * `docs/reference/captures-air3/vol-thermalassistant-boutonsnavig.png` — `_bg: 0`
   * donne des cases blanches opaques, `_bg: 100` ne peint aucun fond.
   */
  it('signale un widget d’affichage entièrement recouvert par un opaque (_bg 0) placé après lui', () => {
    const masked = widget(1000, 1000, 2000, 2000)
    const opaque = widget(0, 0, 10000, 10000, 0)
    const text = textOf(pick(warningsOf(documentWith([masked, opaque])), 'geometry'))
    expect(text).toMatch(/caché par le gadget 2/)
  })

  it('ne signale rien quand le même opaque est placé avant', () => {
    // L'ordre du tableau EST l'ordre de dessin : un opaque placé avant ne masque rien.
    const masked = widget(1000, 1000, 2000, 2000)
    const opaque = widget(0, 0, 10000, 10000, 0)
    expect(kinds(warningsOf(documentWith([opaque, masked])))).not.toContain('geometry')
  })

  it('ne signale pas un recouvrement par un widget translucide', () => {
    const under = widget(1000, 1000, 2000, 2000)
    const translucent = widget(0, 0, 10000, 10000, 40)
    expect(kinds(warningsOf(documentWith([under, translucent])))).not.toContain('geometry')
  })

  it('ne signale pas un recouvrement par un widget à _bg 100, qui ne peint aucun fond', () => {
    // Le cas exact du WLiveMessage du corpus : pleine largeur, dessiné en dernier,
    // par-dessus deux WButtonNavig — et pourtant les deux boutons sont parfaitement
    // visibles sur vol-thermalassistant-boutonsnavig.png. La raison est son `_bg: 100`,
    // pas une propriété de son type.
    const masked = widget(1000, 1000, 2000, 2000)
    const sansFond = widget(0, 0, 10000, 10000, 100)
    expect(kinds(warningsOf(documentWith([masked, sansFond])))).not.toContain('geometry')
  })

  /** Le `WLiveMessage` du corpus, exactement : pleine largeur, dessiné en dernier. */
  function liveMessage(background: number): string {
    return `{
      "CLASS": "org.xcontest.XCTrack.widget.w.WLiveMessage",
      "X1": 0, "Y1": 0, "X2": 10000, "Y2": 10000,
      "_border": false, "_bg": ${background}, "_theme": "", "line_count": 2, "show_time": 300
    }`
  }

  it('ne signale pas le WLiveMessage du corpus, qui porte _bg 100', () => {
    const masked = widget(1000, 1000, 2000, 2000)
    expect(kinds(warningsOf(documentWith([masked, liveMessage(100)])))).not.toContain('geometry')
  })

  /**
   * **Plus aucun type n'est exempté.** `registerTransparent('WLiveMessage')` excluait ce
   * type du calcul quel que soit son `_bg` ; c'était un pansement sur l'inversion. La
   * règle ne connaît plus que `_bg`, et un `WLiveMessage` à `_bg: 0` masque donc ce qu'il
   * recouvre, comme n'importe quel autre widget.
   *
   * Réserve assumée : aucun fichier du corpus ne porte un `WLiveMessage` à `_bg: 0`, et
   * personne n'a observé ce cas sur l'appareil. La règle suit ce que le fichier déclare
   * — le seul choix qu'on puisse défendre sans mesure.
   */
  it('signale en revanche un WLiveMessage à _bg 0 : le type n’est plus un passe-droit', () => {
    const masked = widget(1000, 1000, 2000, 2000)
    const text = textOf(pick(warningsOf(documentWith([masked, liveMessage(0)])), 'geometry'))
    expect(text).toMatch(/caché par le gadget 2/)
    expect(text).toContain('Réception de messages')
  })
})

describe('avertissements — bouton d’action recouvert : un montage, pas un défaut', () => {
  /** L'assistant de thermique du propriétaire : opaque, aux bornes exactes du dessous. */
  const carte = (): string => widget(0, 0, 10000, 10000, 0)

  it('range un bouton d’action recouvert hors des défauts de géométrie', () => {
    const warnings = warningsOf(documentWith([button(1000, 1000, 2000, 2000), carte()]))
    expect(kinds(warnings)).not.toContain('geometry')
    expect(kinds(warnings)).toContain('covered-buttons')
  })

  it('range un widget d’affichage recouvert dans les défauts, et nulle part ailleurs', () => {
    const warnings = warningsOf(documentWith([widget(1000, 1000, 2000, 2000), carte()]))
    expect(kinds(warnings)).toContain('geometry')
    expect(kinds(warnings)).not.toContain('covered-buttons')
  })

  it('sépare les deux sur une même page, sans en perdre un', () => {
    const warnings = warningsOf(documentWith([
      button(1000, 1000, 2000, 2000), widget(3000, 3000, 4000, 4000), carte()
    ]))
    expect(pick(warnings, 'covered-buttons')?.items).toHaveLength(1)
    expect(pick(warnings, 'geometry')?.items).toHaveLength(1)
    expect(textOf(pick(warnings, 'covered-buttons'))).toContain('gadget 1')
    expect(textOf(pick(warnings, 'geometry'))).toContain('gadget 2')
  })

  /**
   * Le classement doit valoir pour toute la famille, pas pour le seul type que le
   * propriétaire emploie : `isActionButton` lit le catalogue, et le catalogue en donne
   * neuf dans la 1.0.3-beta5.
   */
  it('vaut pour les neuf types de la famille « Boutons d’actions »', () => {
    const family = [
      'WButtonBrightness', 'WButtonCamera', 'WButtonIntentLauncher', 'WButtonNavig',
      'WButtonPhone', 'WButtonVario', 'WButtonVolume', 'WButtonVolumeReminder', 'WButtonZoom'
    ]
    for (const shortName of family) {
      expect(isActionButton(shortName), shortName).toBe(true)
      const warnings = warningsOf(documentWith([button(1000, 1000, 2000, 2000, shortName), carte()]))
      expect(kinds(warnings), shortName).not.toContain('geometry')
      expect(kinds(warnings), shortName).toContain('covered-buttons')
    }
  })

  it('ne prend pas un widget d’affichage pour un bouton', () => {
    for (const shortName of ['WAltitude', 'WSpeed', 'WThermalAssistant', 'WLiveMessage']) {
      expect(isActionButton(shortName), shortName).toBe(false)
    }
    // Un type inconnu du catalogue n'est pas un bouton : mieux vaut signaler à tort que
    // rassurer à tort.
    expect(isActionButton('WPMissing')).toBe(false)
  })

  /**
   * La liste vient du catalogue extrait de l'APK, pas d'une énumération recopiée ici :
   * une version de XCTrack qui ajoute un bouton l'ajoute donc toute seule. Ce test le
   * démontre en relisant la source.
   */
  it('tire la famille du catalogue, et non d’une liste écrite à la main', () => {
    const catalog = CATALOG as { widgets: Record<string, { family: string }> }
    const fromCatalog = Object.entries(catalog.widgets)
      .filter(([, entry]) => entry.family === 'wgButtons')
      .map(([shortName]) => shortName)

    expect(fromCatalog.length).toBeGreaterThan(0)
    for (const shortName of fromCatalog) expect(isActionButton(shortName), shortName).toBe(true)
    // Et rien d'autre : le reste du registre reste du côté des défauts.
    for (const shortName of Object.keys(catalog.widgets)) {
      expect(isActionButton(shortName), shortName).toBe(catalog.widgets[shortName]!.family === 'wgButtons')
    }
  })

  it('un bouton d’action reste un défaut quand sa boîte est dégénérée', () => {
    // La famille n'exempte que du recouvrement : un rectangle inversé reste une erreur.
    const warnings = warningsOf(documentWith([button(3000, 0, 3000, 5000)]))
    expect(textOf(pick(warnings, 'geometry'))).toContain('X2')
  })
})

describe('avertissements — corpus réel (comparaison au sol)', () => {
  const geometryItems = (name: string): string[] => pick(warningsOfFile(name), 'geometry')?.items ?? []

  /**
   * **Le faux avertissement qui ne doit jamais revenir.** `WLiveMessage` occupe, dans
   * les 5 fichiers du corpus, une large bande dessinée après deux `WButtonNavig` (plus,
   * sur `landscape[4]`, un `WCompDistanceToGoal` et un `WCompAltitudeOverGoal`). Lu
   * comme un fond opaque, cela donnait 4 items de « recouvrement » par fichier. Or
   * `captures-air3/vol-thermalassistant-boutonsnavig.png` montre les deux boutons
   * parfaitement visibles sur l'appareil : ce `WLiveMessage` porte `_bg: 100`, il ne
   * peint donc **aucun** fond et ne masque personne.
   */
  it('ne signale jamais le WLiveMessage du corpus comme recouvrant', () => {
    for (const name of CORPUS) {
      for (const item of geometryItems(name)) {
        expect(item, `${name} : ${item}`).not.toMatch(/Réception de messages/)
      }
    }
  })

  /**
   * **Ce qui reste, et qui est vrai.** Sur `landscape[3]` des trois fichiers 2026, deux
   * `WButtonBrightness` (`X 2292..8542`, `Y 1034..4483` et `4483..7586`) sont suivis
   * d'un `WThermalAssistant` de bornes `X 2292..8542, Y 1034..7586` — exactement leur
   * union — qui porte `_bg: 0`, un fond **opaque**. `ecran-landscape3-17widgets.png`,
   * qui est cette page sur l'appareil, ne montre effectivement aucun des deux boutons :
   * l'assistant de thermique est un aplat blanc bordé de noir, et rien ne transparaît.
   * Le pilote a rangé ses zones tactiles sous la carte ; l'avertissement dit la
   * conséquence visuelle, qui est exacte.
   *
   * Cet avertissement n'apparaissait pas avant la correction de `_bg` : le critère
   * cherchait `_bg >= 100`, c'est-à-dire précisément les widgets qui ne peignent rien.
   */
  it('ne compte plus les deux WButtonBrightness de landscape[3] parmi les défauts', () => {
    for (const name of ['2026-08-20_backup-00.xcfg', '2026-08-20_pages-00.xcfg', 'backup.xcfg']) {
      expect(kinds(warningsOfFile(name)), name).not.toContain('geometry')
    }
  })

  it('les dit à part, comme un montage volontaire qui fonctionne', () => {
    for (const name of ['2026-08-20_backup-00.xcfg', '2026-08-20_pages-00.xcfg', 'backup.xcfg']) {
      const items = pick(warningsOfFile(name), 'covered-buttons')?.items ?? []
      expect(items, name).toHaveLength(2)
      expect(items[0], name).toBe(
        "Paysage, page 4, gadget 1 (Luminosité de l'écran) : caché par le gadget 3 " +
        '(Assistant thermique), mais toujours actif au doigt'
      )
      expect(items[1], name).toContain("gadget 2 (Luminosité de l'écran)")
    }
  })

  /**
   * Le texte est lu par un pilote, pas par un développeur : ni `_bg`, ni « opaque », ni
   * « dessiné après » ne lui diraient quoi que ce soit de son écran.
   */
  it('dit ce que le pilote verra, sans le vocabulaire du fichier', () => {
    const warning = pick(warningsOfFile('2026-08-20_backup-00.xcfg'), 'covered-buttons')
    const text = textOf(warning)
    for (const jargon of ['_bg', 'opaque', 'dessiné après', 'X1', 'Y1', 'CLASS']) {
      expect(text, jargon).not.toContain(jargon)
    }
    expect(text).toMatch(/doigt/)
  })

  it('ne produit aucun bouton caché sur les deux fichiers 2025', () => {
    for (const name of ['2025-07-07_backup-00.xcfg', '2025-07-07_pages-00.xcfg']) {
      expect(kinds(warningsOfFile(name)), name).not.toContain('covered-buttons')
    }
  })

  it('ne produit aucun défaut géométrique sur les deux fichiers 2025', () => {
    for (const name of ['2025-07-07_backup-00.xcfg', '2025-07-07_pages-00.xcfg']) {
      expect(kinds(warningsOfFile(name)), name).not.toContain('geometry')
    }
  })
})

describe('avertissements — thème dessiné différent du thème déclaré', () => {
  /** Un widget portant un `_theme` propre — le corpus élargi en compte 46. */
  function themedWidget(theme: string): string {
    return `{
      "CLASS": "org.xcontest.XCTrack.widget.w.WAltitude",
      "X1": 0, "Y1": 0, "X2": 1000, "Y2": 1000,
      "_border": true, "_bg": 100, "_theme": "${theme}"
    }`
  }

  /** Le même document, avec un bloc `preferences` qui déclare un thème. */
  function documentWithTheme(theme: string, widgets: string[] = [widget(0, 0, 1000, 1000)]): JsonNode {
    return parseJson(`{
      "info": { "device": "AIR3 AIR3-7.2 8.1.0", "exportType": "backup", "versionCode": ${REFERENCE_VERSION_CODE} },
      "preferences": { "Display.Theme": "${theme}", "Display.Language": "fr" },
      "layout": {
        "landscape": [
          {
            "CLASS": "org.xcontest.XCTrack.page.WPEmpty",
            "navigations": "all",
            "widgets": [${widgets.join(',')}]
          }
        ],
        "portrait": []
      }
    }`)
  }

  it('se tait quand le fichier demande le thème que l’on sait dessiner', () => {
    expect(kinds(warningsOf(documentWithTheme('WhiteHCTheme')))).not.toContain('theme-not-drawn')
  })

  it('signale un thème sombre déclaré par le fichier', () => {
    const warning = pick(warningsOf(documentWithTheme('BlackTheme')), 'theme-not-drawn')
    expect(warning).toBeDefined()
    expect(warning!.moment).toBe('import')
    expect(textOf(warning)).toContain('BlackTheme')
    expect(textOf(warning)).toContain('WhiteHCTheme')
  })

  it('signale un thème inconnu du catalogue des cinq thèmes de l’APK', () => {
    const warning = pick(warningsOf(documentWithTheme('ThemeVenuDuFutur')), 'theme-not-drawn')
    expect(textOf(warning)).toContain('inconnu')
  })

  it('ne crie pas « inconnu » sur un thème catalogué', () => {
    const warning = pick(warningsOf(documentWithTheme('WhiteEInkTheme')), 'theme-not-drawn')
    expect(textOf(warning)).not.toContain('inconnu')
  })

  it('compte les widgets qui posent leur propre thème, et les nomme', () => {
    const document = documentWithTheme('WhiteHCTheme', [
      themedWidget('WhiteEInkTheme'),
      themedWidget('WhiteEInkTheme'),
      themedWidget('BlackHCTheme'),
      widget(0, 0, 1000, 1000)
    ])
    const warning = pick(warningsOf(document), 'theme-not-drawn')
    expect(warning).toBeDefined()
    // Le thème du document est celui qu'on dessine : seuls les widgets doivent parler.
    expect(textOf(warning)).not.toContain('Thème du fichier')
    expect(warning!.items).toContain('2 gadgets en WhiteEInkTheme')
    expect(warning!.items).toContain('1 gadget en BlackHCTheme')
  })

  it('ignore un `_theme` vide, qui veut dire « celui du document »', () => {
    const document = documentWithTheme('WhiteHCTheme', [themedWidget(''), themedWidget('   ')])
    expect(kinds(warningsOf(document))).not.toContain('theme-not-drawn')
  })

  it('ne double pas l’avertissement des valeurs supposées sur un export « pages »', () => {
    // Un fichier sans `preferences` n'a pas de thème à lui : `assumedValueWarnings` le dit
    // déjà. Redire ici « le thème diffère » ferait deux avertissements pour un seul fait.
    const warnings = warningsOf(documentWith([widget(0, 0, 1000, 1000)]))
    expect(kinds(warnings)).toContain('assumed-values')
    expect(kinds(warnings)).not.toContain('theme-not-drawn')
  })

  it('et cela tient à ce que le thème par défaut soit celui qu’on sait dessiner', () => {
    // Le test précédent ne passe que parce que deux constantes de deux modules
    // coïncident : `DEFAULTS.theme` dans `model/preferences.ts` et le thème que le rendu
    // sait dessiner. Le lien est invisible et se romprait en silence — on l'épingle ici.
    // Si `DEFAULTS.theme` changeait, tout export « pages » porterait soudain cet
    // avertissement en plus de « valeurs supposées ».
    const settings = readRenderSettings(parseJson('{"info":{},"layout":{"landscape":[],"portrait":[]}}'))
    expect(settings.fromDefaults).toBe(true)
    expect(settings.theme).toBe('WhiteHCTheme')
  })

  it('le corpus réel, en WhiteHCTheme, ne déclenche rien', () => {
    for (const name of CORPUS) {
      expect(kinds(warningsOfFile(name))).not.toContain('theme-not-drawn')
    }
  })
})

describe('avertissements — ce qui n’est délibérément pas signalé', () => {
  /**
   * Assertion négative explicite, et non un oubli : le corpus compte 34 chevauchements,
   * tous légitimes — des widgets flottant sur la carte et sur l'assistant de thermique,
   * ce qui est le fonctionnement normal de XCTrack. Les signaler serait 100 % de bruit,
   * et un avertissement de bruit apprend au pilote à ignorer les autres.
   */
  it('ne produit aucun avertissement de chevauchement, sur aucun fichier du corpus', () => {
    for (const name of CORPUS) {
      const items = warningsOfFile(name).flatMap((warning) => warning.items)
      expect(items.filter((item) => /chevauch/i.test(item)), name).toEqual([])
    }

    // Le corpus ne produit plus aucun défaut géométrique du tout, y compris les
    // recouvrements complets — voir la description « corpus réel (comparaison au
    // sol) » ci-dessous (WLiveMessage, exclu depuis qu'il est transparent au repos).
  })

  it('ne signale pas deux widgets qui se recouvrent partiellement', () => {
    const first = widget(0, 0, 5000, 5000)
    const second = widget(2500, 2500, 7500, 7500)
    expect(kinds(warningsOf(documentWith([first, second])))).not.toContain('geometry')
  })
})
