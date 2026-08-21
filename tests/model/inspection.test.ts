import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEVICES, deviceFor, type Device } from '../../src/catalog/devices'
import { loadWidgetCatalog } from '../../src/catalog/widgetCatalog'
import { getMember, readString } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { parseJson } from '../../src/core/parseJson'
import { readLayout, type Layout } from '../../src/model/layout'
import {
  ASSUMED_VALUE_HEIGHT_RATIO,
  DEFAULT_READING_DISTANCE_MM,
  MINIMUM_CHARACTER_ANGLE_ARCMIN,
  OBSOLETE_WIDGET_KEYS,
  RULE_TITLES,
  characterHeightMm,
  describeLocation,
  findingsOfRule,
  inspectLayout,
  minimumWidgetHeightMm,
  remainingArea,
  subtractRectangle,
  unreachableWidgetRanks,
  widgetHeightMm,
  type Finding,
  type InspectionRuleId,
  type Rectangle
} from '../../src/model/inspection'
import { BACKUP_2026 } from '../fixtures/paths'

const AIR3 = DEVICES[0]!

/* ------------------------------------------------------------------ outils de fixture */

/** Un widget fabriqué : les huit clés universelles suffisent, plus ce qu'on ajoute. */
function widget(className: string, box: Rectangle, extras = ''): string {
  return `{
    "CLASS": "org.xcontest.XCTrack.widget.w.${className}",
    "X1": ${box.x1}, "Y1": ${box.y1}, "X2": ${box.x2}, "Y2": ${box.y2},
    "_border": false, "_bg": 100, "_theme": ""${extras === '' ? '' : ',\n    ' + extras}
  }`
}

interface PageSpec {
  className?: string
  navigations?: string
  widgets?: string[]
}

function page(spec: PageSpec): string {
  return `{
    "CLASS": "org.xcontest.XCTrack.page.${spec.className ?? 'WPEmpty'}",
    "navigations": ${spec.navigations ?? '"all"'},
    "widgets": [${(spec.widgets ?? []).join(',')}]
  }`
}

function documentOf(landscape: string[], portrait: string[] = [], proUpTo = 0): JsonNode {
  return parseJson(`{
    "info": {
      "device": "AIR3 AIR3-7.2 8.1.0",
      "exportType": "pages",
      "versionCode": 100030,
      "proUpTo": ${proUpTo}
    },
    "layout": {
      "landscape": [${landscape.join(',')}],
      "portrait": [${portrait.join(',')}]
    }
  }`)
}

function inspect(
  document: JsonNode,
  options: { device?: Device; isProWidget?: (name: string) => boolean; readingDistanceMm?: number } = {}
): Finding[] {
  return inspectLayout({
    document,
    layout: readLayout(document),
    device: options.device ?? AIR3,
    language: 'fr',
    isProWidget: options.isProWidget,
    readingDistanceMm: options.readingDistanceMm
  })
}

/** Un seul écran paysage portant les widgets donnés. */
function inspectOnePage(widgets: string[], spec: Omit<PageSpec, 'widgets'> = {}): Finding[] {
  return inspect(documentOf([page({ ...spec, widgets })]))
}

const rules = (findings: Finding[]): InspectionRuleId[] => findings.map((f) => f.ruleId)
const locations = (findings: Finding[]): string[] => findings.map((f) => describeLocation(f.location))

/** Aire totale d'une région, pour vérifier une soustraction sans dépendre du découpage. */
function totalArea(region: readonly Rectangle[]): number {
  return region.reduce((sum, r) => sum + (r.x2 - r.x1) * (r.y2 - r.y1), 0)
}

/* ============================================================ la soustraction elle-même */

describe('soustraction de rectangles — l’état intermédiaire de la règle 1', () => {
  const unit: Rectangle = { x1: 0, y1: 0, x2: 100, y2: 100 }

  it('rend le rectangle intact quand le cutter est disjoint', () => {
    expect(subtractRectangle(unit, { x1: 200, y1: 200, x2: 300, y2: 300 })).toEqual([unit])
  })

  it('rend le rectangle intact quand le cutter ne fait que toucher un bord', () => {
    // Bord commun en x = 100 : aucune surface partagée, donc rien à retirer.
    expect(subtractRectangle(unit, { x1: 100, y1: 0, x2: 200, y2: 100 })).toEqual([unit])
  })

  it('rend une région vide quand le cutter recouvre exactement', () => {
    expect(subtractRectangle(unit, unit)).toEqual([])
  })

  it('rend une région vide quand le cutter déborde de tous les côtés', () => {
    expect(subtractRectangle(unit, { x1: -10, y1: -10, x2: 110, y2: 110 })).toEqual([])
  })

  it('découpe en quatre morceaux disjoints autour d’un trou central', () => {
    const pieces = subtractRectangle(unit, { x1: 40, y1: 40, x2: 60, y2: 60 })
    expect(pieces).toHaveLength(4)
    expect(totalArea(pieces)).toBe(100 * 100 - 20 * 20)
    // Partition stricte : deux morceaux ne doivent jamais se chevaucher, sinon la
    // somme des aires mentirait et un widget « recouvert » resterait faussement libre.
    for (let i = 0; i < pieces.length; i += 1) {
      for (let j = i + 1; j < pieces.length; j += 1) {
        const a = pieces[i]!
        const b = pieces[j]!
        const overlap =
          Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) *
          Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1))
        expect(overlap).toBe(0)
      }
    }
  })

  it('laisse un liseré d’un dix-millième, qu’un échantillonnage manquerait', () => {
    const pieces = subtractRectangle(unit, { x1: 0, y1: 0, x2: 100, y2: 99.99 })
    expect(pieces).toHaveLength(1)
    expect(pieces[0]).toEqual({ x1: 0, y1: 99.99, x2: 100, y2: 100 })
  })

  it('ignore un cutter dégénéré plutôt que de rendre une région vide', () => {
    expect(subtractRectangle(unit, { x1: 50, y1: 50, x2: 50, y2: 80 })).toEqual([unit])
  })

  it('rend une région vide pour un rectangle dégénéré', () => {
    expect(subtractRectangle({ x1: 10, y1: 10, x2: 10, y2: 20 }, unit)).toEqual([])
  })
})

describe('remainingArea — deux cutters qui couvrent ensemble ce qu’aucun ne couvre seul', () => {
  const target: Rectangle = { x1: 0, y1: 0, x2: 100, y2: 100 }
  const leftHalf: Rectangle = { x1: 0, y1: 0, x2: 50, y2: 100 }
  const rightHalf: Rectangle = { x1: 50, y1: 0, x2: 100, y2: 100 }

  it('laisse une moitié quand un seul cutter agit', () => {
    expect(totalArea(remainingArea(target, [leftHalf]))).toBe(50 * 100)
    expect(totalArea(remainingArea(target, [rightHalf]))).toBe(50 * 100)
  })

  it('ne laisse rien quand les deux agissent — le cas qu’un test d’inclusion rate', () => {
    expect(remainingArea(target, [leftHalf, rightHalf])).toEqual([])
  })

  it('ne laisse rien avec quatre quarts, dans n’importe quel ordre', () => {
    const quarters: Rectangle[] = [
      { x1: 0, y1: 0, x2: 50, y2: 50 },
      { x1: 50, y1: 0, x2: 100, y2: 50 },
      { x1: 0, y1: 50, x2: 50, y2: 100 },
      { x1: 50, y1: 50, x2: 100, y2: 100 }
    ]
    expect(remainingArea(target, quarters)).toEqual([])
    expect(remainingArea(target, [...quarters].reverse())).toEqual([])
  })

  it('laisse la case manquante quand un des quatre quarts s’absente', () => {
    const region = remainingArea(target, [
      { x1: 0, y1: 0, x2: 50, y2: 50 },
      { x1: 50, y1: 0, x2: 100, y2: 50 },
      { x1: 0, y1: 50, x2: 50, y2: 100 }
    ])
    expect(totalArea(region)).toBe(50 * 50)
  })
})

/* ================================================ 1. widget inatteignable au clic */

describe('règle 1 — widget inatteignable au clic', () => {
  it('ne signale rien quand les widgets ne se touchent pas', () => {
    const findings = inspectOnePage([
      widget('WAltitude', { x1: 0, y1: 0, x2: 5000, y2: 5000 }),
      widget('WSpeed', { x1: 5000, y1: 0, x2: 10000, y2: 5000 })
    ])
    expect(findingsOfRule(findings, 'unreachable-widget')).toEqual([])
  })

  it('ne signale pas un simple chevauchement partiel', () => {
    const findings = inspectOnePage([
      widget('WCompMap', { x1: 0, y1: 0, x2: 10000, y2: 10000 }),
      widget('WAltitude', { x1: 0, y1: 0, x2: 2000, y2: 2000 })
    ])
    expect(findingsOfRule(findings, 'unreachable-widget')).toEqual([])
  })

  it('signale le widget recouvert par un seul autre, placé après lui', () => {
    const findings = findingsOfRule(inspectOnePage([
      widget('WAltitude', { x1: 1000, y1: 1000, x2: 2000, y2: 2000 }),
      widget('WCompMap', { x1: 0, y1: 0, x2: 10000, y2: 10000 })
    ]), 'unreachable-widget')
    expect(locations(findings)).toEqual(['Paysage, page 1, widget 1'])
  })

  it('ne signale rien quand le recouvrant est placé AVANT — le sens de la pile', () => {
    // `widgetAtPoint` résout un clic du dernier vers le premier : un widget placé au
    // fond ne vole aucun clic, même s'il est immense et opaque.
    const findings = inspectOnePage([
      widget('WCompMap', { x1: 0, y1: 0, x2: 10000, y2: 10000 }),
      widget('WAltitude', { x1: 1000, y1: 1000, x2: 2000, y2: 2000 })
    ])
    expect(findingsOfRule(findings, 'unreachable-widget')).toEqual([])
  })

  it('signale le widget que DEUX widgets couvrent ensemble, sans qu’aucun le couvre seul', () => {
    // Le cas tordu, et la raison d'être de la soustraction : ni la moitié gauche ni la
    // moitié droite n'englobe la cible ; un test d'inclusion ne verrait rien.
    const findings = findingsOfRule(inspectOnePage([
      widget('WButtonNavig', { x1: 2000, y1: 2000, x2: 8000, y2: 8000 }),
      widget('WLiveMessage', { x1: 0, y1: 0, x2: 5000, y2: 10000 }),
      widget('WLiveMessage', { x1: 5000, y1: 0, x2: 10000, y2: 10000 })
    ]), 'unreachable-widget')
    expect(locations(findings)).toEqual(['Paysage, page 1, widget 1'])
    expect(findings[0]!.severity).toBe('likely-error')
    // Le recouvrement est un fait géométrique, et l'insélectionnabilité en édition est
    // solide des deux côtés (`edition-native-exploration.md` § 2.3). Mais le routage d'un
    // appui EN VOL n'a jamais été observé, et ce sont surtout des boutons d'action qui
    // tombent sous cette règle : le constat pose donc la question au lieu de trancher.
    expect(findings[0]!.certainty).toBe('hypothesis')
    expect(findings[0]!.toVerify).toMatch(/en vol/)
  })

  it('ne signale rien si les deux couvrants laissent un interstice d’une unité', () => {
    const findings = inspectOnePage([
      widget('WButtonNavig', { x1: 2000, y1: 2000, x2: 8000, y2: 8000 }),
      widget('WLiveMessage', { x1: 0, y1: 0, x2: 4999, y2: 10000 }),
      widget('WLiveMessage', { x1: 5000, y1: 0, x2: 10000, y2: 10000 })
    ])
    expect(findingsOfRule(findings, 'unreachable-widget')).toEqual([])
  })

  it('signale un widget que trois bandes couvrent ensemble', () => {
    const findings = findingsOfRule(inspectOnePage([
      widget('WAltitude', { x1: 0, y1: 0, x2: 9000, y2: 9000 }),
      widget('WSpeed', { x1: 0, y1: 0, x2: 10000, y2: 3000 }),
      widget('WSpeed', { x1: 0, y1: 3000, x2: 10000, y2: 6000 }),
      widget('WSpeed', { x1: 0, y1: 6000, x2: 10000, y2: 10000 })
    ]), 'unreachable-widget')
    expect(locations(findings)).toEqual(['Paysage, page 1, widget 1'])
  })

  it('signale un widget recouvert même s’il est transparent au repos', () => {
    // Miroir de `warnings.ts`, qui EXCLUT les types transparents de son calcul de
    // recouvrement : là c'est l'œil, ici c'est le doigt, et un widget invisible vole
    // les clics tout autant qu'un opaque.
    const findings = findingsOfRule(inspectOnePage([
      widget('WAltitude', { x1: 1000, y1: 1000, x2: 2000, y2: 2000 }),
      widget('WLiveMessage', { x1: 0, y1: 0, x2: 10000, y2: 10000 }, '"_bg": 0')
    ]), 'unreachable-widget')
    expect(locations(findings)).toEqual(['Paysage, page 1, widget 1'])
  })

  it('ignore un widget de surface nulle, que warnings.ts signale déjà', () => {
    const findings = inspectOnePage([
      widget('WAltitude', { x1: 3000, y1: 3000, x2: 3000, y2: 5000 }),
      widget('WCompMap', { x1: 0, y1: 0, x2: 10000, y2: 10000 })
    ])
    expect(findingsOfRule(findings, 'unreachable-widget')).toEqual([])
  })

  it('unreachableWidgetRanks rend les rangs à partir de 1, dans l’ordre du fichier', () => {
    const document = documentOf([page({
      widgets: [
        widget('WAltitude', { x1: 0, y1: 0, x2: 1000, y2: 1000 }),
        widget('WSpeed', { x1: 2000, y1: 2000, x2: 3000, y2: 3000 }),
        widget('WCompMap', { x1: 0, y1: 0, x2: 10000, y2: 10000 })
      ]
    })])
    expect(unreachableWidgetRanks(readLayout(document).landscape[0]!)).toEqual([1, 2])
  })
})

/* ================================================ 2. page qui ne s'affichera jamais */

describe('règle 2 — page qui ne s’affichera jamais', () => {
  it('signale « navigations »: "none"', () => {
    const findings = findingsOfRule(
      inspectOnePage([widget('WAltitude', { x1: 0, y1: 0, x2: 100, y2: 100 })], { navigations: '"none"' }),
      'page-never-shown'
    )
    expect(locations(findings)).toEqual(['Paysage, page 1'])
    expect(findings[0]!.severity).toBe('to-know')
    expect(findings[0]!.certainty).toBe('documented')
    expect(findings[0]!.message).toContain('1 widget ')
  })

  it('signale une liste de navigations vide', () => {
    const findings = inspectOnePage([], { navigations: '[]' })
    expect(rules(findings)).toEqual(['page-never-shown'])
  })

  it('ne signale pas « all »', () => {
    expect(inspectOnePage([], { navigations: '"all"' })).toEqual([])
  })

  it('ne signale pas une page seulement restreinte — c’est un réglage normal', () => {
    const restricted = '["org.xcontest.XCTrack.navig.TaskCompetition"]'
    expect(inspectOnePage([], { navigations: restricted })).toEqual([])
  })

  it('ne signale rien quand la clé « navigations » est absente', () => {
    // `readLayout` replie sur `none` dans ce cas ; un fichier qui ne dit rien ne dit
    // pas que la page est éteinte. On relit donc le nœud brut.
    const document = parseJson(`{
      "info": { "exportType": "pages" },
      "layout": {
        "landscape": [{ "CLASS": "org.xcontest.XCTrack.page.WPEmpty", "widgets": [] }],
        "portrait": []
      }
    }`)
    const layout = readLayout(document)
    expect(layout.landscape[0]!.navigations.kind).toBe('none')
    expect(inspect(document)).toEqual([])
  })

  it('accorde le pluriel des widgets', () => {
    const two = [
      widget('WAltitude', { x1: 0, y1: 0, x2: 100, y2: 100 }),
      widget('WSpeed', { x1: 200, y1: 200, x2: 300, y2: 300 })
    ]
    const findings = findingsOfRule(inspectOnePage(two, { navigations: '"none"' }), 'page-never-shown')
    expect(findings[0]!.message).toContain('2 widgets ')
  })
})

/* ============================== 3. page d'assistant de thermique jamais atteinte */

describe('règle 3 — page d’assistant de thermique hors cible', () => {
  const thermalPage = (): string => page({ className: 'WPThermalAssistant' })

  it('ne signale rien quand il n’y en a qu’une', () => {
    expect(inspect(documentOf([thermalPage()]))).toEqual([])
  })

  it('signale toutes sauf la dernière, et nomme la cible', () => {
    const findings = findingsOfRule(
      inspect(documentOf([thermalPage(), page({}), thermalPage(), thermalPage()])),
      'thermal-page-not-auto-target'
    )
    expect(locations(findings)).toEqual(['Paysage, page 1', 'Paysage, page 3'])
    expect(findings[0]!.message).toContain('la page 4')
    expect(findings[0]!.certainty).toBe('documented')
  })

  it('compte les orientations séparément', () => {
    const findings = findingsOfRule(
      inspect(documentOf([thermalPage()], [thermalPage()])),
      'thermal-page-not-auto-target'
    )
    expect(findings).toEqual([])
  })

  it('signale dans l’orientation portrait aussi', () => {
    const findings = findingsOfRule(
      inspect(documentOf([], [thermalPage(), thermalPage()])),
      'thermal-page-not-auto-target'
    )
    expect(locations(findings)).toEqual(['Portrait, page 1'])
  })
})

/* ================================================= 4. widget trop petit pour être lu */

describe('règle 4 — lisibilité', () => {
  it('convertit une minute d’arc en millimètres', () => {
    // 16′ à 50 cm ≈ 2,33 mm ; 22′ ≈ 3,20 mm. Les deux valeurs de l’ISO 9241-303
    // citées dans le cahier des charges.
    expect(characterHeightMm(16, 500)).toBeCloseTo(2.327, 2)
    expect(characterHeightMm(22, 500)).toBeCloseTo(3.200, 2)
  })

  it('double le seuil quand on double la distance de lecture', () => {
    expect(minimumWidgetHeightMm(1000)).toBeCloseTo(2 * minimumWidgetHeightMm(500), 6)
  })

  it('le seuil est bien la hauteur de caractère minimale divisée par la fraction supposée', () => {
    const expected =
      characterHeightMm(MINIMUM_CHARACTER_ANGLE_ARCMIN, DEFAULT_READING_DISTANCE_MM) /
      ASSUMED_VALUE_HEIGHT_RATIO
    expect(minimumWidgetHeightMm()).toBeCloseTo(expected, 9)
    expect(minimumWidgetHeightMm()).toBeCloseTo(4.85, 2)
  })

  it('mesure la hauteur physique d’un widget sur l’AIR³ 7.2', () => {
    // Dalle paysage 155,0 × 87,2 mm : un widget d’un dixième de hauteur fait 8,7 mm.
    const document = documentOf([page({
      widgets: [widget('WAltitude', { x1: 0, y1: 0, x2: 10000, y2: 1000 })]
    })])
    const w = readLayout(document).landscape[0]!.widgets[0]!
    expect(widgetHeightMm(w, AIR3, 'landscape')).toBeCloseTo(8.72, 2)
  })

  it('signale un widget sous le seuil et pas un widget au-dessus', () => {
    // 344/10000 de 87,2 mm ≈ 3,0 mm — la hauteur des trois plus petits widgets de
    // Fred ; 600/10000 ≈ 5,2 mm, au-dessus du seuil de 4,85 mm.
    const findings = findingsOfRule(inspectOnePage([
      widget('WThermalAltGain', { x1: 0, y1: 0, x2: 1040, y2: 344 }),
      widget('WStatusLine', { x1: 0, y1: 1000, x2: 10000, y2: 1600 })
    ]), 'widget-too-small')
    expect(locations(findings)).toEqual(['Paysage, page 1, widget 1'])
    expect(findings[0]!.certainty).toBe('hypothesis')
    expect(findings[0]!.toVerify).toBeDefined()
    expect(findings[0]!.message).toContain('3,0 mm')
  })

  it('le seuil suit la distance de lecture passée en paramètre', () => {
    const widgets = [widget('WStatusLine', { x1: 0, y1: 0, x2: 10000, y2: 600 })]
    const document = documentOf([page({ widgets })])
    expect(findingsOfRule(inspect(document), 'widget-too-small')).toEqual([])
    // À 1 m, le même widget de 5,2 mm passe sous le seuil de 9,7 mm.
    const far = inspect(document, { readingDistanceMm: 1000 })
    expect(locations(findingsOfRule(far, 'widget-too-small'))).toEqual(['Paysage, page 1, widget 1'])
  })

  it('le seuil suit l’appareil : la même page sur une plus petite dalle', () => {
    // 600/10000 : 5,2 mm sur la dalle de 87,2 mm de l’AIR³ (au-dessus du seuil de
    // 4,85 mm), 4,5 mm sur celle de 74,7 mm d’un 16:9 de 6 pouces (en dessous).
    const widgets = [widget('WThermalAltGain', { x1: 0, y1: 0, x2: 1040, y2: 600 })]
    const document = documentOf([page({ widgets })])
    const small = DEVICES.find((d) => d.id === 'ratio-16-9')!
    expect(small.diagonalInches).toBeLessThan(AIR3.diagonalInches)
    expect(findingsOfRule(inspect(document), 'widget-too-small')).toEqual([])
    expect(findingsOfRule(inspect(document, { device: small }), 'widget-too-small')).toHaveLength(1)
  })

  it('ne signale pas un widget de hauteur nulle — c’est l’affaire de warnings.ts', () => {
    const findings = inspectOnePage([widget('WAltitude', { x1: 0, y1: 500, x2: 1000, y2: 500 })])
    expect(findingsOfRule(findings, 'widget-too-small')).toEqual([])
  })
})

/* ============================================ 5. widget Pro sans licence déclarée */

describe('règle 5 — widget Pro et proUpTo: 0', () => {
  const withBrightness = (proUpTo: number): JsonNode => documentOf(
    [page({ widgets: [widget('WButtonBrightness', { x1: 0, y1: 0, x2: 5000, y2: 5000 })] })],
    [], proUpTo
  )
  const proOnly = (name: string): boolean => name === 'WButtonBrightness'

  it('ne dit rien sans prédicat Pro — on ne devine pas le catalogue', () => {
    expect(findingsOfRule(inspect(withBrightness(0)), 'pro-widget-without-licence')).toEqual([])
  })

  it('pose la question quand proUpTo vaut 0', () => {
    const findings = findingsOfRule(
      inspect(withBrightness(0), { isProWidget: proOnly }),
      'pro-widget-without-licence'
    )
    expect(locations(findings)).toEqual(['Paysage, page 1, widget 1'])
    expect(findings[0]!.certainty).toBe('hypothesis')
    expect(findings[0]!.toVerify).toContain('proUpTo')
  })

  it('formule un doute, jamais un verdict', () => {
    const finding = findingsOfRule(
      inspect(withBrightness(0), { isProWidget: proOnly }), 'pro-widget-without-licence'
    )[0]!
    expect(finding.message).toContain('?')
    expect(finding.message).toContain('ne le savons pas')
    // Aucune affirmation sur ce que fera l'appareil.
    expect(finding.message).not.toContain('sera remplacé')
    expect(finding.message).not.toMatch(/ne s.affichera pas/)
  })

  it('se tait quand proUpTo n’est pas 0', () => {
    const findings = inspect(withBrightness(1893456000), { isProWidget: proOnly })
    expect(findingsOfRule(findings, 'pro-widget-without-licence')).toEqual([])
  })

  it('se tait quand aucun widget de la page n’est Pro', () => {
    const document = documentOf(
      [page({ widgets: [widget('WAltitude', { x1: 0, y1: 0, x2: 5000, y2: 5000 })] })], [], 0
    )
    expect(findingsOfRule(inspect(document, { isProWidget: proOnly }), 'pro-widget-without-licence'))
      .toEqual([])
  })
})

/* ================================================== 6. deux cartes routières */

describe('règle 6 — au plus une carte routière par page', () => {
  const themed = (theme: string): string =>
    `"mapWidget_mapAppearance": { "theme": "${theme}", "terrain": "None" }`
  const map = (theme: string, box: Rectangle): string => widget('WCompMap', box, themed(theme))

  it('ne signale rien avec une seule carte routière', () => {
    const findings = inspectOnePage([
      map('ClearpilotForest', { x1: 0, y1: 0, x2: 5000, y2: 5000 }),
      map('None', { x1: 5000, y1: 0, x2: 10000, y2: 5000 })
    ])
    expect(findingsOfRule(findings, 'road-maps-on-same-page')).toEqual([])
  })

  it('signale la deuxième et les suivantes sur la même page', () => {
    const findings = findingsOfRule(inspectOnePage([
      map('ClearpilotForest', { x1: 0, y1: 0, x2: 3000, y2: 5000 }),
      map('ClearpilotForestDark', { x1: 3000, y1: 0, x2: 6000, y2: 5000 }),
      map('Hyperpilot', { x1: 6000, y1: 0, x2: 9000, y2: 5000 })
    ]), 'road-maps-on-same-page')
    expect(locations(findings)).toEqual([
      'Paysage, page 1, widget 2', 'Paysage, page 1, widget 3'
    ])
    expect(findings[0]!.severity).toBe('likely-error')
    expect(findings[0]!.certainty).toBe('documented')
    expect(findings[0]!.message).toContain('widget 1')
  })

  it('ne signale rien quand les deux cartes sont sur des pages différentes', () => {
    // C'est exactement la configuration de Fred, et celle des 21 fichiers du corpus :
    // lire la contrainte « par configuration » signalerait 21 fichiers sur 21.
    const findings = inspect(documentOf([
      page({ widgets: [map('ClearpilotForest', { x1: 0, y1: 0, x2: 10000, y2: 10000 })] }),
      page({ widgets: [map('ClearpilotForestDark', { x1: 0, y1: 0, x2: 10000, y2: 10000 })] })
    ]))
    expect(findingsOfRule(findings, 'road-maps-on-same-page')).toEqual([])
  })

  it('reconnaît aussi l’ancienne forme booléenne mapWidget_showOpenStreet', () => {
    const findings = findingsOfRule(inspectOnePage([
      widget('WXCAssistant', { x1: 0, y1: 0, x2: 5000, y2: 5000 }, '"mapWidget_showOpenStreet": true'),
      widget('WCompMap', { x1: 5000, y1: 0, x2: 10000, y2: 5000 }, '"mapWidget_showOpenStreet": true')
    ]), 'road-maps-on-same-page')
    expect(locations(findings)).toEqual(['Paysage, page 1, widget 2'])
  })

  it('ne compte pas mapWidget_showOpenStreet: false', () => {
    const findings = inspectOnePage([
      widget('WXCAssistant', { x1: 0, y1: 0, x2: 5000, y2: 5000 }, '"mapWidget_showOpenStreet": false'),
      widget('WCompMap', { x1: 5000, y1: 0, x2: 10000, y2: 5000 }, '"mapWidget_showOpenStreet": true')
    ])
    expect(findingsOfRule(findings, 'road-maps-on-same-page')).toEqual([])
  })

  it('le nouveau schéma l’emporte sur l’ancien quand les deux sont là', () => {
    // Un widget migré qui aurait gardé son ancien booléen ne doit pas compter deux fois
    // ni contredire le thème effectif.
    const both = '"mapWidget_mapAppearance": { "theme": "None", "terrain": "None" }, ' +
      '"mapWidget_showOpenStreet": true'
    const findings = inspectOnePage([
      widget('WCompMap', { x1: 0, y1: 0, x2: 5000, y2: 5000 }, both),
      map('ClearpilotForest', { x1: 5000, y1: 0, x2: 10000, y2: 5000 })
    ])
    expect(findingsOfRule(findings, 'road-maps-on-same-page')).toEqual([])
  })
})

/* ================================================== 7. clés d'un schéma périmé */

describe('règle 7 — réglages d’une version antérieure', () => {
  it('nomme la clé, son remplaçant, et rassure', () => {
    const findings = findingsOfRule(inspectOnePage([
      widget('WCompass', { x1: 0, y1: 0, x2: 5000, y2: 5000 }, '"showWind": true, "newWindArrow": false')
    ]), 'obsolete-key')
    expect(findings).toHaveLength(1)
    expect(findings[0]!.message).toContain('showWind → windStyle')
    expect(findings[0]!.message).toContain('newWindArrow → windStyle')
    expect(findings[0]!.message).toContain('Rien n’est perdu')
    expect(findings[0]!.severity).toBe('to-know')
    expect(findings[0]!.certainty).toBe('measured')
  })

  it('rend un seul constat par widget, quel que soit le nombre de clés', () => {
    const findings = findingsOfRule(inspectOnePage([
      widget('WCompMap', { x1: 0, y1: 0, x2: 5000, y2: 5000 },
        '"mapWidget_showOpenStreet": false, "mapWidget_showTerrain": false, "nav_use_brackets": true')
    ]), 'obsolete-key')
    expect(findings).toHaveLength(1)
    expect(findings[0]!.message).toContain('des réglages écrits')
  })

  it('ne signale pas les clés du schéma courant', () => {
    const findings = inspectOnePage([
      widget('WCompMap', { x1: 0, y1: 0, x2: 5000, y2: 5000 },
        '"nav_label": "DISTANCE_BRACKETS", "windStyle": "ARROW"')
    ])
    expect(findingsOfRule(findings, 'obsolete-key')).toEqual([])
  })

  it('la table pointe les trois remplaçants connus', () => {
    expect(new Set(Object.values(OBSOLETE_WIDGET_KEYS)))
      .toEqual(new Set(['mapWidget_mapAppearance', 'nav_label', 'windStyle']))
  })
})

/* ==================================================== ce qu'on ne signale PAS */

describe('ce que ce module refuse de signaler', () => {
  it('ne signale aucun chevauchement partiel, fût-il énorme', () => {
    // 34 chevauchements dans le corpus, tous délibérés — c'est un idiome documenté.
    const findings = inspectOnePage([
      widget('WThermalAssistant', { x1: 0, y1: 0, x2: 10000, y2: 10000 }),
      widget('WAltitude', { x1: 0, y1: 0, x2: 9999, y2: 9999 }),
      widget('WSpeed', { x1: 1, y1: 1, x2: 10000, y2: 10000 })
    ])
    expect(findings).toEqual([])
  })

  it('ne signale ni géométrie invalide ni clé dupliquée — c’est warnings.ts', () => {
    const findings = inspectOnePage([
      widget('WAltitude', { x1: 5000, y1: 5000, x2: 1000, y2: 1000 }),
      widget('WSpeed', { x1: -500, y1: 0, x2: 20000, y2: 1000 })
    ])
    expect(rules(findings)).not.toContain('unreachable-widget')
    expect(findings.every((f) => f.ruleId === 'widget-too-small')).toBe(true)
  })

  it('ne touche jamais au document', () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const document = parseJson(source)
    inspect(document)
    expect(readString(getMember(document, 'info')!, 'exportType')).toBe('backup')
    expect(JSON.stringify(readLayout(document).landscape.length)).toBe('5')
  })

  it('chaque règle a un titre en français', () => {
    for (const [id, title] of Object.entries(RULE_TITLES)) {
      expect(title.length, id).toBeGreaterThan(5)
    }
    expect(Object.keys(RULE_TITLES)).toHaveLength(7)
  })

  it('un constat « hypothesis » dit toujours ce qui le lèverait, et lui seul', () => {
    const document = parseJson(readFileSync(BACKUP_2026, 'utf8'))
    const findings = inspectLayout({
      document,
      layout: readLayout(document),
      device: deviceFor(readString(getMember(document, 'info')!, 'device')),
      language: 'fr',
      isProWidget: (name) => name === 'WButtonBrightness'
    })
    for (const finding of findings) {
      expect(finding.toVerify === undefined, finding.ruleId).toBe(finding.certainty !== 'hypothesis')
    }
  })
})

/* ============================================ la configuration réelle de Fred */

describe('la configuration réelle — 2026-08-20_backup-00.xcfg', () => {
  let document: JsonNode
  let layout: Layout
  let findings: Finding[]

  beforeAll(async () => {
    document = parseJson(readFileSync(BACKUP_2026, 'utf8'))
    layout = readLayout(document)
    const catalog = await loadWidgetCatalog('fr')
    findings = inspectLayout({
      document,
      layout,
      device: deviceFor(readString(getMember(document, 'info')!, 'device')),
      language: 'fr',
      isProWidget: catalog.isProWidget
    })
  })

  it('porte bien 105 widgets sur un AIR³ 7.2', () => {
    const count = [...layout.landscape, ...layout.portrait]
      .reduce((sum, p) => sum + p.widgets.length, 0)
    expect(count).toBe(105)
    expect(deviceFor(readString(getMember(document, 'info')!, 'device')).id).toBe('air3-7.2')
  })

  it('règle 1 : exactement les six widgets inatteignables, et lesquels', () => {
    const found = findingsOfRule(findings, 'unreachable-widget').map((finding) => {
      const { orientation, pageRank, widgetRank } = finding.location
      const shortName = layout[orientation][pageRank - 1]!.widgets[widgetRank! - 1]!.shortName
      return `${orientation}[${pageRank - 1}] index ${widgetRank! - 1} ${shortName}`
    })
    expect(found).toEqual([
      'landscape[3] index 0 WButtonBrightness',
      'landscape[3] index 1 WButtonBrightness',
      'landscape[4] index 8 WButtonNavig',
      'landscape[4] index 9 WButtonNavig',
      'landscape[4] index 16 WCompDistanceToGoal',
      'landscape[4] index 17 WCompAltitudeOverGoal'
    ])
  })

  it('règle 2 : la page de compétition de 15 widgets, et elle seule', () => {
    const found = findingsOfRule(findings, 'page-never-shown')
    expect(locations(found)).toEqual(['Paysage, page 2'])
    expect(layout.landscape[1]!.widgets).toHaveLength(15)
    expect(layout.landscape[1]!.className).toContain('WPCompetition')
  })

  it('règle 3 : rien — une seule page d’assistant de thermique par orientation', () => {
    expect(findingsOfRule(findings, 'thermal-page-not-auto-target')).toEqual([])
  })

  it('règle 4 : les trois widgets de 3,0 mm, et pas les barres d’état d’usine', () => {
    const found = findingsOfRule(findings, 'widget-too-small')
    expect(locations(found)).toEqual([
      'Paysage, page 2, widget 4', 'Paysage, page 2, widget 6', 'Paysage, page 2, widget 14'
    ])
    // Les trois `WStatusLine` des pages portrait font 5,0 mm : au-dessus du seuil.
    // Ces pages sont celles d'usine de XCTrack — les signaler serait crier au loup.
    for (const finding of found) expect(finding.location.orientation).toBe('landscape')
  })

  it('règle 5 : les deux WButtonBrightness, posés en question', () => {
    const found = findingsOfRule(findings, 'pro-widget-without-licence')
    expect(locations(found)).toEqual([
      'Paysage, page 4, widget 1', 'Paysage, page 4, widget 2'
    ])
    expect(found.every((f) => f.certainty === 'hypothesis')).toBe(true)
  })

  it('règle 6 : rien — les deux cartes routières sont sur des pages différentes', () => {
    expect(findingsOfRule(findings, 'road-maps-on-same-page')).toEqual([])
  })

  it('règle 7 : les quatre widgets des pages portrait jamais rééditées depuis 2022', () => {
    const found = findingsOfRule(findings, 'obsolete-key')
    expect(locations(found)).toEqual([
      'Portrait, page 1, widget 1',
      'Portrait, page 2, widget 1',
      'Portrait, page 3, widget 1',
      'Portrait, page 3, widget 7'
    ])
  })

  it('seize constats en tout — 6 + 1 + 0 + 3 + 2 + 0 + 4 — et pas un chevauchement', () => {
    expect(findings).toHaveLength(16)
    expect(new Set(rules(findings))).toEqual(new Set([
      'unreachable-widget', 'page-never-shown', 'widget-too-small',
      'pro-widget-without-licence', 'obsolete-key'
    ]))
  })
})
