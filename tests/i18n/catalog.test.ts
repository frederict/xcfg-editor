import { describe, expect, it } from 'vitest'
import fr from '../../src/i18n/messages/fr'
import de from '../../src/i18n/messages/de'
import en from '../../src/i18n/messages/en'
import es from '../../src/i18n/messages/es'
import nl from '../../src/i18n/messages/nl'
import { loadMessages, type MessageCatalog, type MessageKey } from '../../src/i18n/catalog'
import { UI_LANGUAGES, type UiLanguage } from '../../src/i18n/languages'
import type { PluralForms } from '../../src/i18n/plural'

/**
 * `npx tsc --noEmit` répond déjà « aucune clé ne manque et aucune forme ne diverge » : le
 * type de chaque catalogue est dérivé du français. Ces tests couvrent les trois choses
 * qu'un type ne voit pas :
 *
 * 1. un **repère nommé oublié** dans une traduction — `{total}` disparu de la phrase
 *    allemande ; le type ne voit qu'une `string` ;
 * 2. une traduction **recopiée du français** par inadvertance ;
 * 3. un **fichier de langue qui ne se charge pas**.
 *
 * Le premier est le plus dangereux : la phrase reste grammaticale, elle ment simplement
 * sur un nombre.
 */

const CATALOGS: Readonly<Record<UiLanguage, MessageCatalog>> = { fr, de, en, es, nl }

const MARKER = /\{([A-Za-z][A-Za-z0-9]*)\}/g

function textsOf(entry: string | PluralForms): string[] {
  if (typeof entry === 'string') return [entry]
  return Object.values(entry).filter((form): form is string => typeof form === 'string')
}

/** L'union des repères de toutes les formes d'un message, triée pour la comparaison. */
function markersOf(entry: string | PluralForms): string[] {
  const found = new Set<string>()
  for (const text of textsOf(entry)) {
    for (const match of text.matchAll(MARKER)) {
      const name = match[1]
      if (name !== undefined) found.add(name)
    }
  }
  return [...found].sort()
}

const KEYS = Object.keys(fr) as MessageKey[]

/**
 * Les traductions légitimement identiques au français, **désignées langue par langue**
 * — `en/personalKind.contact` et non `personalKind.contact`. Toute autre coïncidence est
 * une traduction oubliée.
 *
 * L'exception est nominative parce qu'un mot identique dans une langue ne l'est presque
 * jamais dans les quatre autres : dispenser la clé entière laisserait passer un
 * « Kontakt » allemand oublié, qui est précisément ce que ce test cherche.
 */
const IDENTICAL_ON_PURPOSE: ReadonlySet<string> = new Set<string>([
  // Aucun mot, seulement des repères et de la ponctuation : les cinq langues écrivent
  // forcément la même chose.
  ...UI_LANGUAGES.map((language) => `${language}/zoom.resetTo`),
  ...UI_LANGUAGES.map((language) => `${language}/device.screenSize`),
  // Un mot qui se trouve être le même. Le néerlandais et l'anglais disent « contact »
  // comme le français ; l'anglais dit « position » comme lui.
  'en/personalKind.contact',
  'nl/personalKind.contact',
  'en/personalKind.location',
  /*
   * Domaine `app` (`main.ts`, `views.ts`, `editor.ts`). Trois cas seulement, et aucun
   * n'est une traduction oubliée :
   *
   * - des messages **sans un seul mot** — repères, ponctuation, unité internationale ;
   * - « Zoom », « Portrait », « Escape », « Ctrl » : le mot que la langue emploie
   *   réellement se trouve être celui du français ;
   * - « Configuration XCTrack », le nom que cette application se donne.
   */
  ...UI_LANGUAGES.map((language) => `${language}/view.detailLabel`),
  ...UI_LANGUAGES.map((language) => `${language}/view.position`),
  ...UI_LANGUAGES.map((language) => `${language}/view.rulerCentimeters`),
  ...UI_LANGUAGES.map((language) => `${language}/zoom.label`),
  ...UI_LANGUAGES.map((language) => `${language}/app.name`),
  ...UI_LANGUAGES.map((language) => `${language}/editor.toolTitle`),
  ...UI_LANGUAGES.map((language) => `${language}/editor.doneWithTally`),
  ...UI_LANGUAGES.map((language) => `${language}/editor.doneWithRank`),
  'en/view.portrait',
  'en/view.pageCard',
  'en/view.pageCount',
  'en/editor.duplicateKeys',
  'nl/editor.duplicateKeys',
  'es/editor.duplicateKeys',
  'en/editor.deleteKeys',
  'nl/editor.deleteKeys'
])

describe('catalogues de messages', () => {
  it('portent exactement les mêmes clés que le français', () => {
    for (const language of UI_LANGUAGES) {
      expect(Object.keys(CATALOGS[language]).sort()).toEqual([...KEYS].sort())
    }
  })

  it('portent la même forme — figée là où le français est figé, pluriel là où il l’est', () => {
    for (const key of KEYS) {
      const reference = typeof fr[key]
      for (const language of UI_LANGUAGES) {
        expect(typeof CATALOGS[language][key], `${language} / ${key}`).toBe(reference)
      }
    }
  })

  it('portent « one » et « other » sur chaque message au pluriel', () => {
    for (const key of KEYS) {
      if (typeof fr[key] === 'string') continue
      for (const language of UI_LANGUAGES) {
        const entry = CATALOGS[language][key] as PluralForms
        expect(entry.one, `${language} / ${key}`).toBeTypeOf('string')
        expect(entry.other, `${language} / ${key}`).toBeTypeOf('string')
        expect(entry.one.length, `${language} / ${key}`).toBeGreaterThan(0)
        expect(entry.other.length, `${language} / ${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('portent les mêmes repères nommés que le français', () => {
    // Le cas que le typage ne peut pas voir : une phrase traduite qui laisse tomber
    // `{total}` reste une chaîne parfaitement valide, et ment sur un nombre.
    for (const key of KEYS) {
      const reference = markersOf(fr[key])
      for (const language of UI_LANGUAGES) {
        expect(markersOf(CATALOGS[language][key]), `${language} / ${key}`).toEqual(reference)
      }
    }
  })

  it('exigent « count » sur chaque message au pluriel', () => {
    for (const key of KEYS) {
      if (typeof fr[key] === 'string') continue
      for (const language of UI_LANGUAGES) {
        expect(markersOf(CATALOGS[language][key]), `${language} / ${key}`).toContain('count')
      }
    }
  })

  it('ne recopient pas le français, sauf là où c’est voulu', () => {
    for (const key of KEYS) {
      for (const language of UI_LANGUAGES) {
        if (language === 'fr') continue
        if (IDENTICAL_ON_PURPOSE.has(`${language}/${key}`)) continue
        expect(textsOf(CATALOGS[language][key]), `${language} / ${key}`)
          .not.toEqual(textsOf(fr[key]))
      }
    }
  })

  it('nomment les trois sens de « rétablir » par trois clés distinctes', () => {
    // La collision n'existe qu'en français, et elle est invisible tant qu'on y reste :
    // refaire, remettre le zoom, replacer une entrée. Deux des trois sont à l'écran en
    // même temps en mode édition.
    expect(fr['action.redo']).toBe('Rétablir')
    expect(en['action.redo']).toBe('Redo')
    expect(en['zoom.resetTo']).not.toContain('Redo')
    expect(en['library.entryRestored']).not.toContain('Redo')
    // L'allemand ne doit pas reproduire la collision : *wiederholen* pour refaire,
    // *zurücklegen* pour replacer — et non *wiederherstellen* pour les deux.
    expect(de['action.redo'].toLowerCase()).toContain('wiederhol')
    expect(de['library.entryRestored'].toLowerCase()).not.toContain('wiederhol')
  })

  it('nomment les trois sens de « relevé » par trois clés distinctes', () => {
    // C'est la distinction qui fait la valeur du projet : ce qui est extrait de l'APK
    // n'est pas ce qui est mesuré sur l'appareil.
    expect(en['provenance.apkSurvey']).toContain('survey')
    expect(en['provenance.factoryValueCatalogue']).toContain('catalogue')
    expect(en['provenance.measuredOnDevice']).toContain('measured')
    const three = new Set([
      fr['provenance.apkSurvey'],
      fr['provenance.factoryValueCatalogue'],
      fr['provenance.measuredOnDevice']
    ])
    expect(three.size).toBe(3)
  })

  it('emploient, dans chaque langue, le mot que la chrome de XCTrack emploie', () => {
    // Ce test gardait auparavant une **absence** : le mot n'entrait dans aucune langue,
    // faute de mesure hors du français. La mesure est faite — 55 relevés, ressources de
    // chrome, `pagesetCustomizePageConfigureWidgetTitle` — et le voici qui garde un
    // **choix** : « gadget » en français, *widget* dans les quatre autres.
    expect(fr['common.widgetCount'].one).toContain('gadget')
    expect(de['common.widgetCount'].one).toContain('Widget')
    expect(en['common.widgetCount'].one).toContain('widget')
    expect(es['common.widgetCount'].one).toContain('widget')
    expect(nl['common.widgetCount'].one).toContain('widget')
  })

  it('ne laissent pas le mot de l’une passer dans l’autre', () => {
    // Le vrai risque de l'extraction : un message français écrit « widget » — le dépôt
    // dit « gadget » partout — ou un message allemand écrit « Gadget », qui n'existe nulle
    // part dans la chrome allemande. Aucun des deux ne serait visible en relecture par
    // quelqu'un qui ne lit pas les cinq langues.
    for (const key of KEYS) {
      for (const text of textsOf(fr[key])) {
        expect(text.toLowerCase(), `fr / ${key}`).not.toContain('widget')
      }
      for (const language of UI_LANGUAGES) {
        if (language === 'fr') continue
        for (const text of textsOf(CATALOGS[language][key])) {
          expect(text.toLowerCase(), `${language} / ${key}`).not.toContain('gadget')
        }
      }
    }
  })

  it('se chargent un par un, et rendent la même promesse pour la même langue', async () => {
    for (const language of UI_LANGUAGES) {
      const first = loadMessages(language)
      expect(loadMessages(language)).toBe(first)
      const loaded = await first
      expect(Object.keys(loaded).sort()).toEqual([...KEYS].sort())
    }
  })
})
