import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getMember } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { readLayout, type Page } from '../../src/model/layout'
import { isShownForNoNavigation } from '../../src/model/inspection'
import { setPageNavigations } from '../../src/model/mutations'
import {
  HELD_SCREEN_ORIENTATIONS,
  SCREEN_ORIENTATION_KEY,
  heldScreenOrientation,
  isRepairableHere,
  navigationsBlock,
  pageReachability,
  reachabilityMessage,
  reachabilityRemedy
} from '../../src/model/reachability'
import { makeTranslator } from '../../src/i18n/translate'
import frenchMessages from '../../src/i18n/messages/fr'
import germanMessages from '../../src/i18n/messages/de'
import { BACKUP_2026, PAGES_2026 } from '../fixtures/paths'

const tr = makeTranslator('fr', frenchMessages)
const german = makeTranslator('de', germanMessages)

function pageOf(navigations: string): Page {
  const document = parseJson(`{
    "layout": {
      "landscape": [{
        "CLASS": "org.xcontest.XCTrack.page.WPEmpty",
        "navigations": ${navigations},
        "widgets": []
      }],
      "portrait": []
    }
  }`)
  return readLayout(document).landscape[0]!
}

/** Une page dont le fichier ne dit rien : la clé `navigations` manque tout à fait. */
function pageWithoutNavigations(): Page {
  const document = parseJson(`{
    "layout": {
      "landscape": [{ "CLASS": "org.xcontest.XCTrack.page.WPEmpty", "widgets": [] }],
      "portrait": []
    }
  }`)
  return readLayout(document).landscape[0]!
}

function documentWithOrientation(value: string | undefined): JsonNode {
  const preferences = value === undefined ? '{}' : `{ "Display.Orientation": "${value}" }`
  return parseJson(`{
    "preferences": ${preferences},
    "layout": { "landscape": [], "portrait": [] }
  }`)
}

describe('ce qui empêche une page de s’afficher', () => {
  describe('la ligne « navigations » de la page', () => {
    it('nomme le réglage « Désactivé » quand la page porte « none »', () => {
      expect(navigationsBlock(pageOf('"none"'))).toBe('noNavigation')
    })

    it('nomme la liste vide autrement, parce que ce n’est pas la même écriture', () => {
      expect(navigationsBlock(pageOf('[]'))).toBe('emptyNavigationList')
    })

    it('ne dit rien d’une page que toutes les navigations affichent', () => {
      expect(navigationsBlock(pageOf('"all"'))).toBeUndefined()
    })

    it('ne dit rien d’une page restreinte à certaines navigations', () => {
      expect(navigationsBlock(pageOf('["org.xcontest.XCTrack.navig.TaskCompetition"]')))
        .toBeUndefined()
    })

    it('ne dit rien quand la ligne manque : le fichier ne se prononce pas', () => {
      expect(navigationsBlock(pageWithoutNavigations())).toBeUndefined()
    })

    /**
     * Le défaut corrigé le 2026-08-22 : `readLayout` replie toute chaîne inconnue sur
     * `{ kind: 'none' }`, si bien que l'outil affirmait « ne s'affichera jamais » sur une
     * valeur dont il avouait par ailleurs, dans les remarques sur le fichier, ne pas
     * savoir la lire. Deux phrases contradictoires, dont une inventée.
     */
    it('n’affirme rien sur une valeur qu’il ne sait pas lire', () => {
      expect(navigationsBlock(pageOf('"quelquechose"'))).toBeUndefined()
      expect(navigationsBlock(pageOf('3'))).toBeUndefined()
      expect(navigationsBlock(pageOf('{ "a": 1 }'))).toBeUndefined()
    })

    it('est le seul chemin par lequel la règle 2 du contrôle avant vol décide', () => {
      expect(isShownForNoNavigation(pageOf('"none"'))).toBe(true)
      expect(isShownForNoNavigation(pageOf('[]'))).toBe(true)
      expect(isShownForNoNavigation(pageOf('"quelquechose"'))).toBe(false)
      expect(isShownForNoNavigation(pageWithoutNavigations())).toBe(false)
    })
  })

  describe('l’orientation que les réglages généraux tiennent', () => {
    it('lit les quatre valeurs qui tiennent l’écran, et l’orientation de chacune', () => {
      expect(HELD_SCREEN_ORIENTATIONS.LANDSCAPE).toBe('landscape')
      expect(HELD_SCREEN_ORIENTATIONS.REVERSE_LANDSCAPE).toBe('landscape')
      expect(HELD_SCREEN_ORIENTATIONS.PORTRAIT).toBe('portrait')
      expect(HELD_SCREEN_ORIENTATIONS.REVERSE_PORTRAIT).toBe('portrait')
    })

    it('ne tient rien sur « Automatique » : l’appareil suit sa rotation', () => {
      expect(heldScreenOrientation(documentWithOrientation('SENSOR'))).toBeUndefined()
    })

    it('ne tient rien quand la ligne manque, ni sans réglages généraux du tout', () => {
      expect(heldScreenOrientation(documentWithOrientation(undefined))).toBeUndefined()
      expect(heldScreenOrientation(parseJson('{ "layout": {} }'))).toBeUndefined()
    })

    it('ne tient rien sur une valeur qu’aucune version relevée ne documente', () => {
      expect(heldScreenOrientation(documentWithOrientation('CUBE'))).toBeUndefined()
    })

    it('rend la valeur telle qu’elle s’écrit, pour que l’écran puisse la citer', () => {
      expect(heldScreenOrientation(documentWithOrientation('REVERSE_LANDSCAPE')))
        .toEqual({ held: 'landscape', value: 'REVERSE_LANDSCAPE' })
    })

    it('lit le paysage du backup réel du corpus', () => {
      const document = parseJson(readFileSync(BACKUP_2026, 'utf8'))
      expect(heldScreenOrientation(document)).toEqual({ held: 'landscape', value: 'LANDSCAPE' })
    })

    /** Un export « pages » ne porte aucun réglage général : on ne sait donc rien. */
    it('ne dit rien d’un export « pages », qui ne porte pas les réglages généraux', () => {
      const document = parseJson(readFileSync(PAGES_2026, 'utf8'))
      expect(getMember(document, 'preferences')).toBeUndefined()
      expect(heldScreenOrientation(document)).toBeUndefined()
    })
  })

  describe('les raisons rassemblées, page par page', () => {
    it('n’en trouve aucune sur une page que tout appelle', () => {
      expect(pageReachability({ page: pageOf('"all"'), orientation: 'landscape' })).toEqual([])
    })

    it('trouve la page désactivée', () => {
      expect(pageReachability({ page: pageOf('"none"'), orientation: 'landscape' }))
        .toEqual([{ kind: 'noNavigation' }])
    })

    it('trouve l’écran tenu dans l’autre orientation', () => {
      const document = documentWithOrientation('LANDSCAPE')
      expect(pageReachability({ page: pageOf('"all"'), orientation: 'portrait', document }))
        .toEqual([{ kind: 'screenHeldElsewhere', held: 'landscape', value: 'LANDSCAPE' }])
    })

    it('ne reproche pas à une page paysage un écran tenu en paysage', () => {
      const document = documentWithOrientation('LANDSCAPE')
      expect(pageReachability({ page: pageOf('"all"'), orientation: 'landscape', document }))
        .toEqual([])
    })

    it('cumule les deux raisons, la page d’abord, l’appareil ensuite', () => {
      const document = documentWithOrientation('LANDSCAPE')
      expect(pageReachability({ page: pageOf('[]'), orientation: 'portrait', document }))
        .toEqual([
          { kind: 'emptyNavigationList' },
          { kind: 'screenHeldElsewhere', held: 'landscape', value: 'LANDSCAPE' }
        ])
    })

    it('se tait sur les réglages généraux quand l’appelant ne passe pas le document', () => {
      expect(pageReachability({ page: pageOf('"all"'), orientation: 'portrait' })).toEqual([])
    })
  })

  describe('le remède n’est pas le même selon la raison', () => {
    it('offre le geste sur les deux raisons qui tiennent à la page', () => {
      expect(isRepairableHere({ kind: 'noNavigation' })).toBe(true)
      expect(isRepairableHere({ kind: 'emptyNavigationList' })).toBe(true)
    })

    it('ne l’offre pas sur l’écran tenu, qui est un réglage de tout l’instrument', () => {
      expect(isRepairableHere({
        kind: 'screenHeldElsewhere', held: 'landscape', value: 'LANDSCAPE'
      })).toBe(false)
    })

    it('renvoie aux réglages généraux, et pas à un geste de cet éditeur', () => {
      const text = reachabilityRemedy(
        { kind: 'screenHeldElsewhere', held: 'landscape', value: 'LANDSCAPE' }, tr
      )
      expect(text).toContain('Réglages')
      expect(text).not.toContain('Activer pour toutes les navigations')
    })

    it('nomme le geste offert quand il l’est', () => {
      expect(reachabilityRemedy({ kind: 'noNavigation' }, tr))
        .toContain('Activer pour toutes les navigations')
    })
  })

  describe('la prose', () => {
    it('distingue les deux écritures : le réglage « Désactivé » et la liste vide', () => {
      const disabled = reachabilityMessage({ kind: 'noNavigation' }, tr)
      const empty = reachabilityMessage({ kind: 'emptyNavigationList' }, tr)
      expect(disabled).not.toBe(empty)
      expect(disabled).toContain('Désactivé')
      expect(empty).toContain('liste')
    })

    it('dit d’où vient ce qu’elle affirme : mesuré ici, jamais observé là', () => {
      expect(reachabilityMessage({ kind: 'noNavigation' }, tr)).toContain('AIR³ 7.2')
      expect(reachabilityMessage({ kind: 'emptyNavigationList' }, tr))
        .toContain('jamais été observé')
    })

    it('cite la valeur telle qu’elle s’écrit dans le fichier', () => {
      const text = reachabilityMessage(
        { kind: 'screenHeldElsewhere', held: 'landscape', value: 'REVERSE_LANDSCAPE' }, tr
      )
      expect(text).toContain('Display.Orientation: REVERSE_LANDSCAPE')
    })

    it('dit l’orientation tenue, et celle qui en pâtit', () => {
      const held = reachabilityMessage(
        { kind: 'screenHeldElsewhere', held: 'portrait', value: 'PORTRAIT' }, tr
      )
      expect(held).toContain('portrait')
      expect(held).toContain('paysage')
    })

    it('suit la langue du pilote, sans laisser une phrase française derrière', () => {
      const text = reachabilityMessage({ kind: 'noNavigation' }, german)
      expect(text).toContain('Deaktiviert')
      expect(text).not.toContain('Désactivé')
    })
  })

  describe('le geste écrit ce que XCTrack écrit, et rien d’autre', () => {
    it('rouvre la page de compétition du corpus sans toucher au reste du fichier', () => {
      const source = readFileSync(BACKUP_2026, 'utf8')
      const document = parseJson(source)
      const page = readLayout(document).landscape[1]!
      expect(navigationsBlock(page)).toBe('noNavigation')

      setPageNavigations(page.node, { kind: 'all' })

      const after = serializeJson(document)
      expect(after).toBe(source.replace('"navigations": "none"', '"navigations": "all"'))
      expect(navigationsBlock(readLayout(document).landscape[1]!)).toBeUndefined()
    })

    it('pose la ligne juste après « CLASS » quand elle manque', () => {
      const document = parseJson(`{
        "layout": {
          "landscape": [{ "CLASS": "org.xcontest.XCTrack.page.WPEmpty", "widgets": [] }],
          "portrait": []
        }
      }`)
      const page = readLayout(document).landscape[0]!
      setPageNavigations(page.node, { kind: 'all' })
      const keys = (page.node as { entries: Array<[string, JsonNode]> }).entries
        .map(([key]) => JSON.parse(key) as string)
      expect(keys).toEqual(['CLASS', 'navigations', 'widgets'])
    })

    it('écrit la liste explicite sous sa forme de tableau, comme l’appareil', () => {
      const page = pageOf('"all"')
      setPageNavigations(page.node, {
        kind: 'list', classNames: ['org.xcontest.XCTrack.navig.TaskCompetition']
      })
      expect(serializeJson(getMember(page.node, 'navigations')!))
        .toBe('[\n  "org.xcontest.XCTrack.navig.TaskCompetition"\n]')
    })

    it('n’écrit que le nom de la ligne que XCTrack porte', () => {
      expect(SCREEN_ORIENTATION_KEY).toBe('Display.Orientation')
    })
  })
})
