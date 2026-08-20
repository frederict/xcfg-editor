import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseJson } from '../../src/core/parseJson'
import type { JsonNode } from '../../src/core/jsonDocument'
import { readLayout } from '../../src/model/layout'
import { readRenderSettings } from '../../src/model/preferences'
import {
  REFERENCE_VERSION_CODE,
  computeWarnings,
  warningsAt,
  type Warning,
  type WarningKind
} from '../../src/ui/warnings'

const DIR = '/Users/fred/DEV/XCTrack/Exemples/'

const CORPUS = [
  '2026-08-20_backup-00.xcfg',
  '2026-08-20_pages-00.xcfg',
  'backup.xcfg',
  'complète.xcfg',
  'pages.xcfg'
]

function warningsOfFile(name: string): Warning[] {
  return warningsOf(parseJson(readFileSync(DIR + name, 'utf8')))
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

/** Widget complet : les huit clés universelles, pour n'éveiller que le défaut visé. */
function widget(x1: number, y1: number, x2: number, y2: number, background = 100): string {
  return `{
    "CLASS": "org.xcontest.XCTrack.widget.w.WAltitude",
    "X1": ${x1}, "Y1": ${y1}, "X2": ${x2}, "Y2": ${y2},
    "_border": true, "_bg": ${background}, "_theme": ""
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
    expect(kinds(warningsOfFile('pages.xcfg'))).toContain('assumed-language')
  })

  it('ne la signale pas quand le fichier déclare sa langue', () => {
    // complète.xcfg porte `Display.Language: "fr"`.
    expect(kinds(warningsOfFile('complète.xcfg'))).not.toContain('assumed-language')
  })
})

describe('avertissements — données personnelles', () => {
  it('nomme le pilote, sa voile et ses fichiers de waypoints sur un backup', () => {
    const warning = pick(warningsOfFile('2026-08-20_backup-00.xcfg'), 'personal-data')
    const text = textOf(warning)
    expect(text).toContain('Pilot.Name')
    expect(text).toContain('Glider.Name')
    expect(text).toContain('Livetrack')
    expect(text).toContain('belgian-paragliding-open-2026.CompeGPS.wpt')
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
    expect(text).toContain('cities5000-Belgium.wpt')
  })

  it('liste aussi les fichiers d’espace aérien quand il y en a', () => {
    // `Airspace.Files` est vide dans les backups récents, peuplé dans complète.xcfg.
    const text = textOf(pick(warningsOfFile('complète.xcfg'), 'external-resources'))
    expect(text).toContain('Colombia-Airspaces-2025_0.txt')
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
    const warning = pick(warningsOfFile('complète.xcfg'), 'version-gap')
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
    expect(textOf(pick(warningsOf(document), 'structure'))).toMatch(/classe de page absente/)
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

  it('signale un widget entièrement recouvert par un opaque placé après lui', () => {
    const masked = widget(1000, 1000, 2000, 2000)
    const opaque = widget(0, 0, 10000, 10000, 100)
    const text = textOf(pick(warningsOf(documentWith([masked, opaque])), 'geometry'))
    expect(text).toMatch(/entièrement recouvert/)
  })

  it('ne signale rien quand le même opaque est placé avant', () => {
    // L'ordre du tableau EST l'ordre de dessin : un opaque placé avant ne masque rien.
    const masked = widget(1000, 1000, 2000, 2000)
    const opaque = widget(0, 0, 10000, 10000, 100)
    expect(kinds(warningsOf(documentWith([opaque, masked])))).not.toContain('geometry')
  })

  it('ne signale pas un recouvrement par un widget translucide', () => {
    const under = widget(1000, 1000, 2000, 2000)
    const translucent = widget(0, 0, 10000, 10000, 40)
    expect(kinds(warningsOf(documentWith([under, translucent])))).not.toContain('geometry')
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

      // Les seuls défauts géométriques que le corpus produit sont des recouvrements
      // COMPLETS par un opaque dessiné après — le panneau « Réception de messages »
      // couvre le bandeau bas de la page 5 en paysage. Aucun chevauchement partiel n'y
      // remonte : c'est ce que cette assertion vérifie fichier par fichier.
      const geometry = pick(warningsOfFile(name), 'geometry')?.items ?? []
      expect(geometry.every((item) => /entièrement recouvert/.test(item)), name).toBe(true)
    }
  })

  it('ne signale pas deux widgets qui se recouvrent partiellement', () => {
    const first = widget(0, 0, 5000, 5000)
    const second = widget(2500, 2500, 7500, 7500)
    expect(kinds(warningsOf(documentWith([first, second])))).not.toContain('geometry')
  })
})
