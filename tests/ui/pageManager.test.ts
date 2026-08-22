import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { DEVICES } from '../../src/catalog/devices'
import { getMember, readNumber, setLiteral } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { readLayout, type Page } from '../../src/model/layout'
import { pagesNode, removePage, insertPage, type Orientation } from '../../src/model/mutations'
import { readRenderSettings } from '../../src/model/preferences'
import {
  applyPageOperation,
  autoSwitchTargetRank,
  classChangeAdvice,
  creationLabel,
  describeOperation,
  layoutAdvice,
  navigablePageCount,
  navigationsLabel,
  operationAdvice,
  operationAnnouncement,
  PAGE_CHOICES,
  REPEAT_GUARD_MS,
  renderPageManager,
  resetRemovalGuard,
  shortClassName,
  thermalAssistantRanks,
  type PageOperation
} from '../../src/ui/pageManager'
import { hasNavigationLabel, navigationLabel } from '../../src/catalog/navigationLabels'
import { pageClassLabel } from '../../src/catalog/widgetNames'
import type { ViewContext } from '../../src/ui/views'
import { makeTranslator } from '../../src/i18n'
import frenchMessages from '../../src/i18n/messages/fr'
import { BACKUP_2026, PAGES_2026 } from '../fixtures/paths'

/**
 * Le traducteur de **notre prose**, en français : c'est la langue d'écriture, et donc
 * celle dont les phrases sont vérifiables au caractère près dans ce fichier.
 */
const tr = makeTranslator('fr', frenchMessages)

/**
 * La langue de l'**autre** axe : celle des libellés de XCTrack, c'est-à-dire du fichier
 * ouvert. Les fichiers du corpus déclarent `Display.Language: "fr"`, d'où `'fr'` ici —
 * mais c'est une valeur indépendante de `tr`, et plusieurs tests plus bas la font varier
 * pour vérifier qu'elle l'est bien. Voir `src/i18n/axes.ts`.
 */
const LABELS = 'fr'

/**
 * Deux fichiers réels, pas un cas fabriqué : `backup-00` porte cinq pages en paysage
 * (dont une seule d'assistant de thermique) et trois en portrait, ces dernières avec des
 * `navigations` en liste explicite — la forme que la chaîne « all » ne couvre pas.
 */

const backupSource = readFileSync(BACKUP_2026, 'utf8')
const pagesSource = readFileSync(PAGES_2026, 'utf8')

function load(source = backupSource): JsonNode {
  return parseJson(source)
}

function classesOf(document: JsonNode, orientation: Orientation): string[] {
  return readLayout(document)[orientation].map((page) => shortClassName(page.className))
}

/** Le texte source de chaque page, page par page : la seule comparaison qui fasse foi. */
function pageTexts(document: JsonNode, orientation: Orientation): string[] {
  return pagesNode(document, orientation).items.map((page) => serializeJson(page))
}

function pagesOf(document: JsonNode, orientation: Orientation): Page[] {
  return readLayout(document)[orientation]
}

/* ------------------------------------------------------------------ le corpus lui-même */

describe('l’état du corpus', () => {
  it('décrit cinq pages en paysage, dont une seule d’assistant de thermique', () => {
    const document = load()
    expect(classesOf(document, 'landscape'))
      .toEqual(['WPEmpty', 'WPCompetition', 'WPEmpty', 'WPThermalAssistant', 'WPEmpty'])
    expect(thermalAssistantRanks(pagesOf(document, 'landscape'))).toEqual([4])
    // Une seule des cinq n'est activée pour aucune navigation : la page de compétition.
    // Sa CLASSE n'y est pour rien — l'assistant de thermique de rang 4 porte « all » et
    // revient bel et bien dans le défilement au sol (essai pilote du 22 août 2026).
    expect(navigablePageCount(pagesOf(document, 'landscape'))).toBe(4)
  })

  it('lit les navigations sous leurs trois formes', () => {
    const document = load()
    const landscape = pagesOf(document, 'landscape')
    // Les trois formes disent le sort de la page, pas un compte de navigations — et
    // elles reprennent la phrase de l'appareil, « les types de navigations pour
    // lesquelles la page sera affichée » (mesuré sur l'AIR³, § 5.4).
    expect(navigationsLabel(landscape[0]!, tr, LABELS))
      .toBe('Affichée pour toutes les navigations')
    expect(navigationsLabel(landscape[1]!, tr, LABELS))
      .toBe('Affichée pour aucune navigation')
    // Portrait page 1 : liste explicite de quatre classes `navig.*`. Les quatre noms sont
    // ceux de l'appareil, relevés dans ses ressources (`navTakeoff`, `navTriangleClosing`,
    // `navWaypoint2`, `navLivePilot`) — et non les nôtres : cet outil écrivait
    // « Fermeture de triangle », « Vers une balise » et « Vers un pilote en direct », que
    // le pilote ne trouvait nulle part sur son instrument.
    expect(navigationsLabel(pagesOf(document, 'portrait')[0]!, tr, LABELS))
      .toBe('Affichée pour : Retour au décollage, Triangle achevant, Balises/Navigation XC, ' +
        'Pilote Live')
  })

  it('donne les noms de navigation dans la langue du FICHIER, pas dans la nôtre', () => {
    // Le cas qui décide (`src/i18n/axes.ts`) : un pilote francophone dont l'AIR³ est en
    // anglais. La phrase reste française, les quatre noms passent à l'anglais.
    const page = pagesOf(load(), 'portrait')[0]!
    expect(navigationsLabel(page, tr, 'en'))
      .toBe('Affichée pour : Back to takeoff, Triangle closing, Waypoints / XC Navigation, ' +
        'Live pilot')
    expect(navigationsLabel(page, tr, 'de'))
      .toBe('Affichée pour : Zurück zum Start, Dreieck schliessen, Wegpunkte / XC Navigation, ' +
        'Live Pilot')
  })

  it('replie sur l’anglais la navigation qu’une langue ne porte pas, et rien d’autre', () => {
    // `navLivePilot` n'existe pas en néerlandais dans les ressources de XCTrack 1.0.3 :
    // l'appareil d'un pilote néerlandais affiche donc l'anglais, et cet outil aussi. Ce
    // qui n'est pas mesuré ne s'invente pas — surtout pas une traduction maison qui se
    // ferait passer pour celle de l'appareil.
    expect(hasNavigationLabel('TaskToLivePilot', 'nl')).toBe(false)
    expect(navigationLabel('TaskToLivePilot', 'nl')).toBe('Live pilot')
    // Le repli ne déborde pas : les trois autres sont bien traduites en néerlandais.
    expect(hasNavigationLabel('TaskBackToTakeoff', 'nl')).toBe(true)
    expect(navigationLabel('TaskBackToTakeoff', 'nl')).toBe('Terug naar start')
    expect(navigationLabel('TaskTriangleClosing', 'nl')).toBe('Driehoek gesloten')
    // Une navigation qu'aucune version relevée ne documente garde son nom court.
    expect(navigationLabel('TaskToFuture', 'fr')).toBe('TaskToFuture')
    // Une langue que le catalogue ne porte pas retombe sur l'anglais, comparaison exacte.
    expect(navigationLabel('TaskCompetition', 'fr-FR')).toBe('Competition task')
  })
})

/* ------------------------------------------------------------------------- insertion */

describe('insérer une page', () => {
  it('décale les pages suivantes et laisse le reste du document intact', () => {
    const document = load()
    const before = serializeJson(document)
    const textsBefore = pageTexts(document, 'landscape')

    const result = applyPageOperation(document, 'landscape', {
      kind: 'insert', index: 2, className: 'WPEmpty'
    })

    expect(result.index).toBe(2)
    expect(classesOf(document, 'landscape'))
      .toEqual(['WPEmpty', 'WPCompetition', 'WPEmpty', 'WPEmpty', 'WPThermalAssistant', 'WPEmpty'])

    // Fidélité, page par page : les deux premières n'ont pas bougé, les trois autres ont
    // seulement changé de rang — leur texte source est le même, octet pour octet.
    const textsAfter = pageTexts(document, 'landscape')
    expect(textsAfter[0]).toBe(textsBefore[0])
    expect(textsAfter[1]).toBe(textsBefore[1])
    expect(textsAfter[3]).toBe(textsBefore[2])
    expect(textsAfter[4]).toBe(textsBefore[3])
    expect(textsAfter[5]).toBe(textsBefore[4])

    // Fidélité, document entier : retirer la page insérée rend le fichier d'origine.
    removePage(document, 'landscape', 2)
    expect(serializeJson(document)).toBe(before)
  })

  it('crée une page vide, activée pour toutes les navigations', () => {
    const document = load()
    applyPageOperation(document, 'landscape', {
      kind: 'insert', index: 0, className: 'WPThermalAssistant'
    })
    const page = pagesOf(document, 'landscape')[0]!
    expect(page.className).toBe('org.xcontest.XCTrack.widget.wp.WPThermalAssistant')
    // L'appareil préremplit (12 widgets pour une aide thermique) ; ce jeu n'est pas connu
    // et n'est pas inventé — la page arrive vide et se peuple autrement.
    expect(page.widgets).toHaveLength(0)
    expect(page.navigations).toEqual({ kind: 'all' })
  })

  it('accepte le rang de fin, qui place la page en dernier', () => {
    const document = load()
    const at = applyPageOperation(document, 'landscape', {
      kind: 'insert', index: 5, className: 'WPCompetition'
    }).index
    expect(at).toBe(5)
    expect(classesOf(document, 'landscape')).toHaveLength(6)
    expect(classesOf(document, 'landscape')[5]).toBe('WPCompetition')
  })

  it('refuse un rang hors bornes plutôt que de le ramener en silence', () => {
    const document = load()
    expect(() => applyPageOperation(document, 'landscape', {
      kind: 'insert', index: 6, className: 'WPEmpty'
    })).toThrow()
  })
})

/* ----------------------------------------------------------------------- suppression */

describe('supprimer une page', () => {
  it('rend le document à l’octet près une fois la page réinsérée au même rang', () => {
    for (const source of [backupSource, pagesSource]) {
      for (const orientation of ['landscape', 'portrait'] as const) {
        const document = load(source)
        const before = serializeJson(document)
        const count = pagesOf(document, orientation).length

        for (let index = 0; index < count; index += 1) {
          const removed = applyPageOperation(document, orientation, { kind: 'remove', index }).removed!
          expect(pagesOf(document, orientation)).toHaveLength(count - 1)
          insertPage(document, orientation, removed, index)
          expect(serializeJson(document)).toBe(before)
        }
      }
    }
  })

  it('fait avancer les pages suivantes d’un rang', () => {
    const document = load()
    const textsBefore = pageTexts(document, 'landscape')

    const result = applyPageOperation(document, 'landscape', { kind: 'remove', index: 1 })

    expect(classesOf(document, 'landscape'))
      .toEqual(['WPEmpty', 'WPEmpty', 'WPThermalAssistant', 'WPEmpty'])
    const textsAfter = pageTexts(document, 'landscape')
    expect(textsAfter[1]).toBe(textsBefore[2])
    expect(textsAfter[2]).toBe(textsBefore[3])
    expect(textsAfter[3]).toBe(textsBefore[4])
    // Le rang mis en avant reste le même : c'est la page suivante qui l'occupe.
    expect(result.index).toBe(1)
  })

  it('ne met plus rien en avant quand la dernière page part', () => {
    const document = load()
    for (let index = 4; index >= 0; index -= 1) {
      const result = applyPageOperation(document, 'landscape', { kind: 'remove', index })
      if (index > 0) expect(result.index).toBe(index - 1)
      else expect(result.index).toBeUndefined()
    }
    expect(pagesOf(document, 'landscape')).toHaveLength(0)
  })
})

/* ----------------------------------------------------------------------- duplication */

describe('dupliquer une page', () => {
  it('produit une copie indépendante, jusqu’aux paramètres inconnus de ses widgets', () => {
    const document = load()
    const originalText = pageTexts(document, 'landscape')[3]!

    // Page 4 : l'assistant de thermique, dix-sept widgets, dont une carte portant une
    // cinquantaine de clés qu'aucune couche de cet outil ne modélise.
    applyPageOperation(document, 'landscape', { kind: 'duplicate', index: 3 })
    expect(classesOf(document, 'landscape'))
      .toEqual(['WPEmpty', 'WPCompetition', 'WPEmpty', 'WPThermalAssistant', 'WPThermalAssistant', 'WPEmpty'])
    expect(pageTexts(document, 'landscape')[4]).toBe(originalText)

    const items = pagesNode(document, 'landscape').items
    const copy = items[4]!
    const original = items[3]!

    // Une coordonnée de la copie : l'original ne bouge pas.
    const copyWidget = getMember(copy, 'widgets')!
    const originalWidget = getMember(original, 'widgets')!
    expect(copyWidget.kind).toBe('array')
    expect(originalWidget.kind).toBe('array')
    const copyFirst = (copyWidget as { items: JsonNode[] }).items[0]!
    const originalFirst = (originalWidget as { items: JsonNode[] }).items[0]!
    const keptX1 = readNumber(originalFirst, 'X1')
    setLiteral(copyFirst, 'X1', '42')
    expect(readNumber(copyFirst, 'X1')).toBe(42)
    expect(readNumber(originalFirst, 'X1')).toBe(keptX1)

    // Une clé qu'aucune couche de l'outil ne modélise — `mapScale`, portée par le
    // WThermalAssistant de cette page — et la comparaison se fait sur le texte source
    // entier du widget, seule preuve que rien d'autre n'a bougé.
    const hasUnknownKey = (widget: JsonNode): boolean => getMember(widget, 'mapScale') !== undefined
    const copyThermal = (copyWidget as { items: JsonNode[] }).items.find(hasUnknownKey)!
    const originalThermal = (originalWidget as { items: JsonNode[] }).items.find(hasUnknownKey)!
    const keptText = serializeJson(originalThermal)
    setLiteral(copyThermal, 'mapScale', '999')
    expect(serializeJson(copyThermal)).not.toBe(keptText)
    expect(serializeJson(originalThermal)).toBe(keptText)

    // Et l'original est resté celui du fichier.
    expect(pageTexts(document, 'landscape')[3]).toBe(originalText)
  })

  it('dépose la copie juste après l’original', () => {
    const document = load()
    expect(applyPageOperation(document, 'landscape', { kind: 'duplicate', index: 0 }).index).toBe(1)
  })

  it('restitue le document une fois la copie retirée', () => {
    const document = load()
    const before = serializeJson(document)
    applyPageOperation(document, 'portrait', { kind: 'duplicate', index: 2 })
    removePage(document, 'portrait', 3)
    expect(serializeJson(document)).toBe(before)
  })
})

/* -------------------------------------------------------------------- réordonnancement */

describe('réordonner les pages', () => {
  it('change l’ordre sans rien perdre, et le retour rend le fichier d’origine', () => {
    const document = load()
    const before = serializeJson(document)
    const textsBefore = pageTexts(document, 'landscape')

    applyPageOperation(document, 'landscape', { kind: 'reorder', from: 3, to: 0 })
    expect(classesOf(document, 'landscape'))
      .toEqual(['WPThermalAssistant', 'WPEmpty', 'WPCompetition', 'WPEmpty', 'WPEmpty'])

    const textsAfter = pageTexts(document, 'landscape')
    expect([...textsAfter].sort()).toEqual([...textsBefore].sort())
    expect(textsAfter[0]).toBe(textsBefore[3])

    applyPageOperation(document, 'landscape', { kind: 'reorder', from: 0, to: 3 })
    expect(serializeJson(document)).toBe(before)
  })

  it('préserve les navigations en liste explicite du portrait', () => {
    const document = load()
    const navigationsBefore = pagesOf(document, 'portrait').map((page) => page.navigations)
    applyPageOperation(document, 'portrait', { kind: 'reorder', from: 0, to: 2 })
    const after = pagesOf(document, 'portrait').map((page) => page.navigations)
    expect(after[2]).toEqual(navigationsBefore[0])
    expect(after[0]).toEqual(navigationsBefore[1])
  })
})

/* ---------------------------------------------------------------- changement de classe */

describe('changer la classe d’une page', () => {
  it('n’écrit que la clé CLASS et laisse les widgets en place', () => {
    const document = load()
    const widgetsBefore = serializeJson(getMember(pagesNode(document, 'landscape').items[0]!, 'widgets')!)

    applyPageOperation(document, 'landscape', { kind: 'setClass', index: 0, className: 'WPCompetition' })

    const page = pagesOf(document, 'landscape')[0]!
    expect(page.className).toBe('org.xcontest.XCTrack.widget.wp.WPCompetition')
    expect(serializeJson(getMember(pagesNode(document, 'landscape').items[0]!, 'widgets')!))
      .toBe(widgetsBefore)
    // La classe ne décide pas de la visibilité : le compte des pages qu'une navigation
    // affiche ne bouge pas d'un pouce, seule la clé `navigations` le ferait bouger.
    expect(navigablePageCount(pagesOf(document, 'landscape'))).toBe(4)
  })

  it('revient à l’octet près quand on remet la classe d’origine', () => {
    const document = load()
    const before = serializeJson(document)
    applyPageOperation(document, 'landscape', { kind: 'setClass', index: 0, className: 'WPCompetition' })
    expect(serializeJson(document)).not.toBe(before)
    applyPageOperation(document, 'landscape', { kind: 'setClass', index: 0, className: 'WPEmpty' })
    expect(serializeJson(document)).toBe(before)
  })
})

/* ------------------------------------------------ l’assistant de thermique, et sa cible */

describe('détecter plusieurs assistants de thermique', () => {
  it('ne signale rien tant qu’il n’y en a qu’un', () => {
    const document = load()
    const pages = pagesOf(document, 'landscape')
    expect(autoSwitchTargetRank(pages)).toBe(4)
    expect(layoutAdvice(pages, tr).filter((advice) => advice.kind === 'thermal')).toHaveLength(0)
  })

  it('désigne la DERNIÈRE comme cible dès qu’il y en a deux', () => {
    const document = load()
    applyPageOperation(document, 'landscape', { kind: 'duplicate', index: 3 })
    const pages = pagesOf(document, 'landscape')

    expect(thermalAssistantRanks(pages)).toEqual([4, 5])
    expect(autoSwitchTargetRank(pages)).toBe(5)

    const thermal = layoutAdvice(pages, tr).filter((advice) => advice.kind === 'thermal')
    expect(thermal).toHaveLength(1)
    expect(thermal[0]!.text).toContain('la page 5')
    expect(thermal[0]!.text).toContain('page suivante')
  })

  it('en trouve trois et ne se trompe pas de cible', () => {
    const document = load()
    applyPageOperation(document, 'landscape', { kind: 'duplicate', index: 3 })
    applyPageOperation(document, 'landscape', { kind: 'setClass', index: 0, className: 'WPThermalAssistant' })
    const pages = pagesOf(document, 'landscape')
    // La copie s'est posée en 5, et la page 1 a changé de classe : rien n'a décalé.
    expect(thermalAssistantRanks(pages)).toEqual([1, 4, 5])
    expect(autoSwitchTargetRank(pages)).toBe(5)
  })

  it('prévient AVANT de créer la seconde, et nomme celle qui perd le basculement', () => {
    const document = load()
    const pages = pagesOf(document, 'landscape')

    const onDuplicate = operationAdvice(pages, { kind: 'duplicate', index: 3 }, tr)
      .filter((advice) => advice.kind === 'thermal')
    expect(onDuplicate).toHaveLength(1)
    expect(onDuplicate[0]!.text).toContain('page 4')

    const onInsert = operationAdvice(pages, {
      kind: 'insert', index: 0, className: 'WPThermalAssistant'
    }, tr).filter((advice) => advice.kind === 'thermal')
    expect(onInsert).toHaveLength(1)

    // Insérer une page ordinaire ne dit rien du basculement : pas de bruit.
    expect(operationAdvice(pages, { kind: 'insert', index: 0, className: 'WPEmpty' }, tr)
      .filter((advice) => advice.kind === 'thermal')).toHaveLength(0)
  })

  it('ne se prévient pas lui-même quand la page changée est déjà l’unique assistant', () => {
    const document = load()
    const pages = pagesOf(document, 'landscape')
    // La page 4 EST l'assistant : lui redonner sa classe ne crée pas de doublon.
    expect(operationAdvice(pages, { kind: 'setClass', index: 3, className: 'WPThermalAssistant' }, tr)
      .filter((advice) => advice.kind === 'thermal')).toHaveLength(0)
  })

  it('dit ce que la suppression de l’assistant coûte au basculement', () => {
    const document = load()
    const single = operationAdvice(pagesOf(document, 'landscape'), { kind: 'remove', index: 3 }, tr)
      .filter((advice) => advice.kind === 'thermal')
    expect(single[0]!.text).toContain('n’aurait plus de cible')

    applyPageOperation(document, 'landscape', { kind: 'duplicate', index: 3 })
    const paired = operationAdvice(pagesOf(document, 'landscape'), { kind: 'remove', index: 4 }, tr)
      .filter((advice) => advice.kind === 'thermal')
    expect(paired[0]!.text).toContain('la page 4')
  })
})

/* --------------------------------------------------------- décalage et visibilité */

describe('avertir du décalage des rangs', () => {
  it('nomme les pages qui changent de rang à l’insertion', () => {
    const pages = pagesOf(load(), 'landscape')
    const advice = operationAdvice(pages, { kind: 'insert', index: 2, className: 'WPEmpty' }, tr)
      .filter((item) => item.kind === 'shift')
    expect(advice).toHaveLength(1)
    expect(advice[0]!.text).toContain('Les pages 3 à 5 deviennent 4 à 6')
    expect(advice[0]!.text).toContain('seule identité')
  })

  it('se tait quand l’insertion se fait en fin de liste', () => {
    const pages = pagesOf(load(), 'landscape')
    expect(operationAdvice(pages, { kind: 'insert', index: 5, className: 'WPEmpty' }, tr)
      .filter((item) => item.kind === 'shift')).toHaveLength(0)
    // Dupliquer la dernière page ne décale rien non plus.
    expect(operationAdvice(pages, { kind: 'duplicate', index: 4 }, tr)
      .filter((item) => item.kind === 'shift')).toHaveLength(0)
  })

  it('accorde au singulier quand une seule page bouge', () => {
    const pages = pagesOf(load(), 'landscape')
    const advice = operationAdvice(pages, { kind: 'remove', index: 3 }, tr)
      .filter((item) => item.kind === 'shift')
    expect(advice[0]!.text).toContain('La page 5 devient 4')
  })

  it('signale qu’aucune page ne resterait activée pour une navigation', () => {
    const document = load()
    // On ne garde que la page libre du rang 1 et la page de compétition du rang 2, la
    // seule du fichier dont `navigations` vaut « none » : supprimer la libre ne laisse
    // que des pages qu'aucune navigation n'affiche.
    applyPageOperation(document, 'landscape', { kind: 'remove', index: 4 })
    applyPageOperation(document, 'landscape', { kind: 'remove', index: 3 })
    applyPageOperation(document, 'landscape', { kind: 'remove', index: 2 })
    const pages = pagesOf(document, 'landscape')
    expect(classesOf(document, 'landscape')).toEqual(['WPEmpty', 'WPCompetition'])

    const advice = operationAdvice(pages, { kind: 'remove', index: 0 }, tr)
      .filter((item) => item.kind === 'visibility')
    expect(advice).toHaveLength(1)
    expect(advice[0]!.text).toContain('activées pour aucune navigation')
  })

  it('signale la disparition de la dernière page', () => {
    const document = load()
    for (let index = 4; index >= 1; index -= 1) {
      applyPageOperation(document, 'landscape', { kind: 'remove', index })
    }
    const advice = operationAdvice(pagesOf(document, 'landscape'), { kind: 'remove', index: 0 }, tr)
      .filter((item) => item.kind === 'visibility')
    expect(advice[0]!.text).toContain('dernière page')
  })

  /**
   * Le contre-exemple qui compte : passer trois pages en `WPCompetition` ne les masque
   * plus, parce que la classe n'a jamais masqué quoi que ce soit. Seule la clé
   * `navigations` le fait, et le carrousel ne la modifie pas — d'où la suppression des
   * quatre autres pages pour ne garder que celle du fichier qui porte « none ».
   */
  it('ne dit rien quand trois pages changent de classe, tout quand aucune n’a de navigation', () => {
    const byClass = load()
    applyPageOperation(byClass, 'landscape', { kind: 'setClass', index: 0, className: 'WPCompetition' })
    applyPageOperation(byClass, 'landscape', { kind: 'setClass', index: 2, className: 'WPCompetition' })
    applyPageOperation(byClass, 'landscape', { kind: 'setClass', index: 4, className: 'WPCompetition' })
    expect(layoutAdvice(pagesOf(byClass, 'landscape'), tr)
      .filter((item) => item.kind === 'visibility')).toHaveLength(0)

    const byNavigations = load()
    for (const index of [4, 3, 2, 0]) {
      applyPageOperation(byNavigations, 'landscape', { kind: 'remove', index })
    }
    expect(classesOf(byNavigations, 'landscape')).toEqual(['WPCompetition'])
    const advice = layoutAdvice(pagesOf(byNavigations, 'landscape'), tr)
      .filter((item) => item.kind === 'visibility')
    expect(advice).toHaveLength(1)
    expect(advice[0]!.text).toContain('activées pour aucune navigation')
  })

  it('dit toujours que le changement de classe n’est pas vérifié sur l’appareil', () => {
    const pages = pagesOf(load(), 'landscape')
    const advice = operationAdvice(pages, { kind: 'setClass', index: 0, className: 'WPCompetition' }, tr)
    expect(advice).toContainEqual(classChangeAdvice(tr))
    expect(classChangeAdvice(tr).text).toContain('n’a PAS')
  })
})

/* ----------------------------------------------------------------------- descriptions */

describe('la description d’une opération', () => {
  const pages = pagesOf(load(), 'landscape')
  const describe1 = (operation: PageOperation): string =>
    describeOperation(pages, operation, 'landscape', tr, LABELS)

  it('nomme le rang, pas un identifiant interne', () => {
    expect(describe1({ kind: 'remove', index: 2 })).toBe('Supprimer la page 3 (paysage)')
    expect(describe1({ kind: 'duplicate', index: 1 })).toBe('Dupliquer la page 2 au rang 3 (paysage)')
    expect(describe1({ kind: 'reorder', from: 3, to: 1 })).toBe('Déplacer la page 4 au rang 2 (paysage)')
    expect(describe1({ kind: 'insert', index: 2, className: 'WPThermalAssistant' }))
      .toBe('Insérer une page « Aide thermique » au rang 3 (paysage)')
    expect(describe1({ kind: 'setClass', index: 0, className: 'WPCompetition' }))
      .toBe('Changer le type de la page 1 : « Vide » → « Compétition » (paysage)')
  })

  it('distingue les deux orientations', () => {
    expect(describeOperation(pages, { kind: 'remove', index: 0 }, 'portrait', tr, LABELS))
      .toBe('Supprimer la page 1 (portrait)')
  })

  it('reprend les libellés de l’appareil pour les quatre classes', () => {
    expect(PAGE_CHOICES.map((className) => pageClassLabel(className, 'fr')))
      .toEqual(['Aide thermique', 'Aide XC', 'Compétition', 'Vide'])
    expect(creationLabel('org.xcontest.XCTrack.widget.wp.WPEmpty', 'fr')).toBe('Vide')
    // Une classe inconnue garde son nom court plutôt que d'être rangée de force.
    expect(creationLabel('org.xcontest.XCTrack.widget.wp.WPFuture', 'fr')).toBe('WPFuture')
  })

  it('cite le type de page dans la langue du FICHIER, la phrase restant dans la nôtre', () => {
    // Le pas d'historique revient derrière « Annuler : », hors de l'écran qui l'a produit.
    // Il doit y porter le mot que le pilote a lu sur son instrument, pas notre traduction.
    expect(describeOperation(
      pages, { kind: 'insert', index: 2, className: 'WPThermalAssistant' }, 'landscape', tr, 'en'
    )).toBe('Insérer une page « Thermal Assistant » au rang 3 (paysage)')
    expect(describeOperation(
      pages, { kind: 'setClass', index: 0, className: 'WPCompetition' }, 'landscape', tr, 'de'
    )).toBe('Changer le type de la page 1 : « Leer » → « Wettbewerb » (paysage)')
  })

  it('joint la conséquence à l’annonce faite après coup', () => {
    const message = operationAnnouncement(
      pages, { kind: 'remove', index: 0 }, 'landscape', tr, LABELS
    )
    expect(message).toContain('Supprimer la page 1 (paysage)')
    expect(message).toContain('Les pages 2 à 5 deviennent 1 à 4')
  })

  /*
   * Ce que le panneau de confirmation disait avant le geste, l'annonce le dit après : il
   * n'y a plus de panneau, et la vignette disparue ne portera plus le compte.
   */
  it('chiffre ce qui part avec la page, puisque la vignette ne le dira plus', () => {
    const message = operationAnnouncement(
      pages, { kind: 'remove', index: 0 }, 'landscape', tr, LABELS
    )
    expect(message).toContain(`${pages[0]!.widgets.length} gadgets partent avec elle.`)
  })

  it('dit tout ce que le retrait coûte, et non le seul décalage des rangs', () => {
    // Une orientation réduite à une page : la supprimer ne laisse plus rien à afficher.
    const single = pages.slice(0, 1)
    const message = operationAnnouncement(
      single, { kind: 'remove', index: 0 }, 'landscape', tr, LABELS
    )
    expect(message).toContain('C’est la dernière page de cette orientation')
  })

  /*
   * Le remède ferme les SIX annonces, pas seulement celle du retrait : un remède nommé une
   * fois sur deux n'apprend rien, et le pilote ne saurait pas de quels gestes il vaut.
   */
  it('nomme « Annuler » à la fin de chaque annonce, quel que soit le geste', () => {
    const gestures: PageOperation[] = [
      { kind: 'insert', index: 1, className: 'WPEmpty' },
      { kind: 'duplicate', index: 1 },
      { kind: 'remove', index: 1 },
      { kind: 'reorder', from: 0, to: 2 },
      { kind: 'setClass', index: 1, className: 'WPCompetition' },
      { kind: 'enableAllNavigations', index: 1 }
    ]
    for (const gesture of gestures) {
      expect(operationAnnouncement(pages, gesture, 'landscape', tr, LABELS))
        .toContain('«\u202fAnnuler\u202f», dans la barre du haut, revient sur ce geste')
    }
  })
})

/* --------------------------------------------------------------------- le carrousel */

const air3 = DEVICES.find((device) => device.id === 'air3-7.2')!

function context(document: JsonNode): ViewContext {
  return { device: air3, settings: readRenderSettings(document), language: 'fr' }
}

interface Captured { operation: PageOperation; description: string }

function build(overrides: Partial<Parameters<typeof renderPageManager>[0]> = {}): {
  root: HTMLElement; captured: Captured[]; document: JsonNode
} {
  const document = load()
  const captured: Captured[] = []
  const manager = renderPageManager({
    pages: pagesOf(document, 'landscape'),
    orientation: 'landscape',
    ctx: context(document),
    tr,
    onOperation: (operation, description) => captured.push({ operation, description }),
    ...overrides
  })
  return { root: manager.root, captured, document }
}

const query = <T extends Element>(root: ParentNode, selector: string): T[] =>
  Array.from(root.querySelectorAll<T>(selector))

describe('le carrousel', () => {
  // Le garde-fou du coup double survit aux rendus : il doit donc mourir entre deux tests.
  beforeEach(resetRemovalGuard)

  it('pose un point d’insertion entre chaque page et aux deux extrémités', () => {
    const { root } = build()
    expect(query(root, '.pages__slot')).toHaveLength(5)
    // Six points pour cinq pages : c'est la forme relevée sur l'appareil.
    const gaps = query<HTMLElement>(root, '.pages__gap')
    expect(gaps).toHaveLength(6)
    expect(gaps.map((gap) => gap.dataset.at)).toEqual(['0', '1', '2', '3', '4', '5'])
  })

  it('ouvre les quatre classes de l’appareil, et insère au rang du point touché', () => {
    const { root, captured } = build()
    const gap = query<HTMLElement>(root, '.pages__gap')[2]!
    const opener = gap.querySelector<HTMLButtonElement>('.pages__insert')!
    const choice = gap.querySelector<HTMLElement>('.pages__choice')!

    expect(choice.hidden).toBe(true)
    opener.click()
    expect(choice.hidden).toBe(false)
    expect(opener.getAttribute('aria-expanded')).toBe('true')

    const items = query<HTMLButtonElement>(choice, '.pages__choice-item')
    expect(items).toHaveLength(4)
    // Le décalage se lit avant le clic, dans la boîte elle-même.
    expect(choice.textContent).toContain('Les pages 3 à 5 deviennent 4 à 6')

    items[3]!.click()
    expect(captured).toHaveLength(1)
    expect(captured[0]!.operation).toEqual({ kind: 'insert', index: 2, className: 'WPEmpty' })
    expect(captured[0]!.description).toBe('Insérer une page « Vide » au rang 3 (paysage)')
  })

  it('titre chaque classe avec le mot de l’appareil, et la commente avec le nôtre', () => {
    // Les deux axes, l'un sous l'autre dans le même bouton : le titre vient de
    // `widgetLabels.json` (langue du fichier), la note du catalogue `pageKind.*Note`
    // (langue du pilote). Ils ne se confondent jamais.
    const { root } = build()
    const choice = query<HTMLElement>(root, '.pages__gap')[0]!
    choice.querySelector<HTMLButtonElement>('.pages__insert')!.click()

    expect(query(choice, '.pages__choice-label').map((node) => node.textContent))
      .toEqual(['Aide thermique', 'Aide XC', 'Compétition', 'Vide'])
    expect(query(choice, '.pages__choice-note')[3]!.textContent)
      .toBe('Créée vide sur l’instrument, prête pour vos propres gadgets.')
  })

  it('passe les quatre titres à l’anglais quand le FICHIER est en anglais', () => {
    // Notre prose ne bouge pas d'un mot : c'est l'autre axe qui a changé.
    const { root } = build({ ctx: { ...context(load()), language: 'en' } })
    const choice = query<HTMLElement>(root, '.pages__gap')[0]!
    choice.querySelector<HTMLButtonElement>('.pages__insert')!.click()

    expect(query(choice, '.pages__choice-label').map((node) => node.textContent))
      .toEqual(['Thermal Assistant', 'XC Assistant', 'Competition', 'Empty'])
    expect(query(choice, '.pages__choice-note')[3]!.textContent)
      .toBe('Créée vide sur l’instrument, prête pour vos propres gadgets.')
    // La ligne « Affichée pour : … » de chaque vignette suit le même axe.
    expect(root.textContent).toContain('Affichée pour toutes les navigations')
  })

  it('prévient dans la boîte d’insertion qu’une seconde aide thermique déplace la cible', () => {
    const { root } = build()
    const gap = query<HTMLElement>(root, '.pages__gap')[0]!
    gap.querySelector<HTMLButtonElement>('.pages__insert')!.click()
    expect(gap.textContent).toContain('cet éditeur suppose la DERNIÈRE')
  })

  /*
   * ⚠️ Ce test disait le contraire jusqu'au 2026-08-22 : le bouton s'armait, puis
   * confirmait. La confirmation tombait sur le même bouton, aux mêmes pixels, et un
   * pilote-testeur a supprimé une page de vingt gadgets en la traversant sans la voir.
   * Elle est remplacée par ce que le geste DIT, puisque « Annuler » le reprend.
   */
  it('supprime au premier clic, comme « Dupliquer », et sans rien armer', () => {
    const { root, captured } = build()
    const card = query<HTMLElement>(root, '.pages__slot')[1]!
    const remove = card.querySelector<HTMLButtonElement>('.pagecard__remove')!

    expect(remove.textContent).toBe('Supprimer')
    remove.click()

    expect(captured).toHaveLength(1)
    expect(captured[0]!.operation).toEqual({ kind: 'remove', index: 1 })
    expect(captured[0]!.description).toBe('Supprimer la page 2 (paysage)')
    // Rien ne s'est armé au passage : le libellé n'a pas bougé.
    expect(remove.textContent).toBe('Supprimer')
    expect(card.querySelector('.pagecard__consequences')).toBeNull()
  })

  it('dit, à l’instant du clic, ce qui part et par où revenir', () => {
    const { root, document } = build()
    const page = pagesOf(document, 'landscape')[1]!
    query<HTMLElement>(root, '.pages__slot')[1]!
      .querySelector<HTMLButtonElement>('.pagecard__remove')!.click()

    const said = root.querySelector<HTMLElement>('.pages__live')!.textContent ?? ''
    expect(said).toContain('Supprimer la page 2 (paysage)')
    expect(said).toContain(`${page.widgets.length} gadgets partent avec elle.`)
    expect(said).toContain('Les pages 3 à 5 deviennent 2 à 4')
    expect(said).toContain('«\u202fAnnuler\u202f», dans la barre du haut')
  })

  /*
   * Le trou ouvert par le clic unique : l'appelant reconstruit dans la foulée, et la carte
   * suivante vient occuper les pixels de celle qui part. Sans garde-fou, un double-clic
   * emporterait deux pages pour une seule annonce.
   */
  it('avale le second coup d’un double-clic sur « Supprimer »', () => {
    let clock = 10_000
    const { root, captured } = build({ now: () => clock })
    const slots = query<HTMLElement>(root, '.pages__slot')
    slots[1]!.querySelector<HTMLButtonElement>('.pagecard__remove')!.click()
    clock += REPEAT_GUARD_MS - 1
    // Le carrousel réel aurait été reconstruit entre les deux : c'est le bouton du VOISIN
    // qui se retrouve sous le curseur, et c'est lui qu'on clique.
    slots[2]!.querySelector<HTMLButtonElement>('.pagecard__remove')!.click()
    expect(captured).toHaveLength(1)
  })

  it('laisse repartir une suppression volontaire passé le délai', () => {
    let clock = 10_000
    const { root, captured } = build({ now: () => clock })
    const slots = query<HTMLElement>(root, '.pages__slot')
    slots[1]!.querySelector<HTMLButtonElement>('.pagecard__remove')!.click()
    clock += REPEAT_GUARD_MS
    slots[2]!.querySelector<HTMLButtonElement>('.pagecard__remove')!.click()
    expect(captured).toHaveLength(2)
  })

  it('ne garde le coup double que pour la suppression : dupliquer reste répétable', () => {
    let clock = 10_000
    const { root, captured } = build({ now: () => clock })
    const card = query<HTMLElement>(root, '.pages__slot')[3]!
    const copy = card.querySelector<HTMLButtonElement>('.pagecard__duplicate')!
    copy.click()
    copy.click()
    expect(captured).toHaveLength(2)
  })

  it('duplique sur un seul clic', () => {
    const { root, captured } = build()
    query<HTMLElement>(root, '.pages__slot')[3]!
      .querySelector<HTMLButtonElement>('.pagecard__duplicate')!.click()
    expect(captured[0]!.operation).toEqual({ kind: 'duplicate', index: 3 })
    expect(captured[0]!.description).toBe('Dupliquer la page 4 au rang 5 (paysage)')
  })

  it('offre le réordonnancement au clavier, et le refuse aux extrémités', () => {
    const { root, captured } = build()
    const slots = query<HTMLElement>(root, '.pages__slot')
    const moves = (slot: HTMLElement): HTMLButtonElement[] =>
      query<HTMLButtonElement>(slot, '.pagecard__move')

    expect(moves(slots[0]!)[0]!.disabled).toBe(true)
    expect(moves(slots[0]!)[1]!.disabled).toBe(false)
    expect(moves(slots[4]!)[0]!.disabled).toBe(false)
    expect(moves(slots[4]!)[1]!.disabled).toBe(true)

    moves(slots[2]!)[0]!.click()
    expect(captured[0]!.operation).toEqual({ kind: 'reorder', from: 2, to: 1 })
    expect(captured[0]!.description).toBe('Déplacer la page 3 au rang 2 (paysage)')
  })

  it('propose la classe des quatre types, et la change quand elle est modifiée', () => {
    const { root, captured } = build()
    const select = query<HTMLElement>(root, '.pages__slot')[0]!
      .querySelector<HTMLSelectElement>('.pagecard__class-select')!
    expect(select.value).toBe('WPEmpty')
    expect(query<HTMLOptionElement>(select, 'option')).toHaveLength(4)

    select.value = 'WPCompetition'
    select.dispatchEvent(new Event('change'))
    expect(captured[0]!.operation).toEqual({ kind: 'setClass', index: 0, className: 'WPCompetition' })

    // Et l'avertissement est visible en permanence, pas seulement au moment du geste.
    expect(root.textContent).toContain('XCTrack ne permet pas de changer le type')
  })

  /**
   * Le nom de classe brut du fichier n'est plus écrit sous chaque vignette depuis le
   * 2026-08-22 : sur neuf pages, il doublait neuf fois un intitulé déjà lisible en
   * français. Ce que cet écran montre de la classe, ce sont les **mots de XCTrack**
   * (`pageClassLabel`, relevés dans l'APK), dans le sélecteur — le pilote les retrouve
   * sur son appareil, ce qui n'a jamais été vrai de `WPEmpty`.
   */
  it('n’écrit le nom de classe du fichier sous aucune vignette', () => {
    const { root } = build()
    expect(query(root, '.pages__slot')).not.toHaveLength(0)
    expect(query(root, '.pagecard__class')).toHaveLength(0)
    for (const slot of query<HTMLElement>(root, '.pagecard__meta')) {
      expect(slot.textContent ?? '').not.toContain('WP')
    }
  })

  it('s’en tient à ce que fait l’appareil quand on le lui demande', () => {
    const { root } = build({ allowClassChange: false })
    expect(query(root, '.pagecard__class-select')).toHaveLength(0)
    expect(root.textContent).not.toContain('XCTrack ne permet pas de changer le type')
  })

  /**
   * Le filet ambre suit `navigations`, jamais la classe. Le rang 2 est la page de
   * compétition, activée pour aucune navigation ; le rang 4 est l'assistant de thermique,
   * activé pour toutes — et c'est lui que l'ancien badge « Masquée hors vol » marquait à
   * tort, alors que l'appareil le montre au sol.
   */
  it('marque la page qu’aucune navigation n’affiche, et non une classe', () => {
    const { root } = build()
    const slots = query<HTMLElement>(root, '.pages__slot')
    expect(slots[1]!.querySelector('.pagecard--conditional')).not.toBeNull()
    expect(slots[0]!.querySelector('.pagecard--conditional')).toBeNull()
    expect(slots[3]!.querySelector('.pagecard--conditional')).toBeNull()
    expect(root.textContent).not.toContain('Masquée hors vol')
    expect(slots[3]!.querySelector('.pagecard__thermal')!.textContent)
      .toBe('Cible supposée du basculement automatique en spirale — non vérifié sur l’appareil.')
  })

  it('désigne la bonne cible quand deux assistants coexistent', () => {
    const document = load()
    applyPageOperation(document, 'landscape', { kind: 'duplicate', index: 3 })
    const manager = renderPageManager({
      pages: pagesOf(document, 'landscape'),
      orientation: 'landscape',
      ctx: context(document),
      tr,
      onOperation: () => {}
    })
    const slots = query<HTMLElement>(manager.root, '.pages__slot')
    expect(slots[3]!.querySelector('.pagecard__thermal')!.textContent)
      .toContain('suppose que le basculement automatique vise la page 5')
    expect(slots[4]!.querySelector('.pagecard__thermal')!.textContent)
      .toBe('Cible supposée du basculement automatique en spirale — non vérifié sur l’appareil.')
    expect(manager.root.textContent).toContain('cet éditeur suppose la dernière, la page 5')
  })

  it('ouvre une page quand l’appelant sait quoi en faire, et reste inerte sinon', () => {
    const opened: number[] = []
    const { root } = build({ onOpen: (index: number) => opened.push(index) })
    query<HTMLButtonElement>(root, '.pagecard__screen')[2]!.click()
    expect(opened).toEqual([2])

    const { root: quiet } = build()
    expect(query<HTMLButtonElement>(quiet, '.pagecard__screen')[0]!.disabled).toBe(true)
  })

  it('annonce l’opération et sa conséquence dans la zone d’annonce', () => {
    const { root } = build()
    query<HTMLElement>(root, '.pages__slot')[3]!
      .querySelector<HTMLButtonElement>('.pagecard__duplicate')!.click()
    const live = root.querySelector<HTMLElement>('.pages__live')!
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toContain('Dupliquer la page 4 au rang 5 (paysage)')
    expect(live.textContent).toContain('La page 5 devient 6')
  })

  it('rend une orientation vide utilisable : un seul point d’insertion, et une explication', () => {
    const document = load()
    const captured: Captured[] = []
    const manager = renderPageManager({
      pages: [],
      orientation: 'portrait',
      ctx: context(document),
      tr,
      onOperation: (operation, description) => captured.push({ operation, description })
    })
    expect(query(manager.root, '.pages__slot')).toHaveLength(0)
    expect(query(manager.root, '.pages__gap')).toHaveLength(1)
    expect(manager.root.textContent).toContain('Une page neuve arrive vide')

    query<HTMLButtonElement>(manager.root, '.pages__insert')[0]!.click()
    query<HTMLButtonElement>(manager.root, '.pages__choice-item')[0]!.click()
    expect(captured[0]!.operation)
      .toEqual({ kind: 'insert', index: 0, className: 'WPThermalAssistant' })
  })
})

/**
 * **Rouvrir une page que rien n'appelle.**
 *
 * Jusqu'au 22 août 2026, ce module savait dire qu'une page ne s'afficherait jamais et
 * n'offrait rien pour y remédier : « il m'apprend que 15 gadgets sont perdus et me renvoie
 * à l'instrument ». Un seul geste répare, et il n'écrit qu'une valeur mesurée — `"all"`,
 * celle que XCTrack pose lui-même sur une page neuve et quand ses cinq icônes sont actives.
 */
describe('le geste qui rouvre une page', () => {
  it('n’apparaît que sur les pages qu’aucune navigation n’affiche', () => {
    const { root } = build()
    const enables = query<HTMLButtonElement>(root, '.pagecard__enable')
    // Une seule des cinq pages paysage du corpus porte `navigations: "none"` : la 2.
    expect(enables).toHaveLength(1)
    const cards = query<HTMLElement>(root, '.pages__slot')
    expect(cards[1]!.querySelector('.pagecard__enable')).not.toBeNull()
    expect(cards[0]!.querySelector('.pagecard__enable')).toBeNull()
  })

  it('n’a pas de contraire : rien ne propose de désactiver une page', () => {
    const { root } = build()
    const labels = query<HTMLButtonElement>(root, 'button').map((node) => node.textContent)
    expect(labels).toContain('Activer pour toutes les navigations')
    expect(labels.some((label) => (label ?? '').includes('Désactiver'))).toBe(false)
  })

  it('demande l’opération sur le bon rang, avec sa description d’historique', () => {
    const { root, captured } = build()
    query<HTMLButtonElement>(root, '.pagecard__enable')[0]!.click()
    expect(captured).toHaveLength(1)
    expect(captured[0]!.operation).toEqual({ kind: 'enableAllNavigations', index: 1 })
    expect(captured[0]!.description)
      .toBe('Activer la page 2 pour toutes les navigations (paysage)')
  })

  it('écrit « all » et ne touche à rien d’autre du fichier', () => {
    const document = load()
    applyPageOperation(document, 'landscape', { kind: 'enableAllNavigations', index: 1 })
    expect(serializeJson(document))
      .toBe(backupSource.replace('"navigations": "none"', '"navigations": "all"'))
  })

  it('fait remonter le compte de pages navigables, et la ligne de la carte avec', () => {
    const document = load()
    const before = pagesOf(document, 'landscape')
    expect(navigablePageCount(before)).toBe(4)
    applyPageOperation(document, 'landscape', { kind: 'enableAllNavigations', index: 1 })
    const after = pagesOf(document, 'landscape')
    expect(navigablePageCount(after)).toBe(5)
    expect(navigationsLabel(after[1]!, tr, LABELS)).toBe('Affichée pour toutes les navigations')
  })

  it('ne décale aucun rang : l’opération ne rend que la page qu’elle a touchée', () => {
    const document = load()
    const result = applyPageOperation(
      document, 'landscape', { kind: 'enableAllNavigations', index: 1 }
    )
    expect(result).toEqual({ index: 1 })
    expect(pagesOf(document, 'landscape')).toHaveLength(5)
  })

  it('refuse un rang qui n’existe pas, plutôt que d’écrire à côté', () => {
    const document = load()
    expect(() => applyPageOperation(
      document, 'landscape', { kind: 'enableAllNavigations', index: 9 }
    )).toThrow(/index 9/)
  })
})
