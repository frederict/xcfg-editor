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
 * Les messages dont la traduction est légitimement identique au français : ils ne portent
 * aucun mot, seulement des repères et de la ponctuation. Toute autre coïncidence est une
 * traduction oubliée.
 */
const IDENTICAL_ON_PURPOSE: ReadonlySet<string> = new Set<MessageKey>([
  'zoom.resetTo',
  'device.screenSize'
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
      if (IDENTICAL_ON_PURPOSE.has(key)) continue
      for (const language of UI_LANGUAGES) {
        if (language === 'fr') continue
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

  it('n’inventent pas « gadget » ou « widget » dans une langue qu’on n’a pas mesurée', () => {
    // La chrome française de XCTrack dit « Gadget » (mesuré sur l'AIR³). Ce que disent ses
    // chromes allemande, néerlandaise et espagnole n'a pas été mesuré, et le catalogue de
    // l'APK ne répond pas : il dit « widget » dans les cinq langues, y compris en français
    // où l'appareil dit « Gadget ». Tant que la mesure manque, le mot n'entre pas.
    for (const language of UI_LANGUAGES) {
      for (const key of KEYS) {
        for (const text of textsOf(CATALOGS[language][key])) {
          expect(text.toLowerCase(), `${language} / ${key}`).not.toContain('gadget')
          expect(text.toLowerCase(), `${language} / ${key}`).not.toContain('widget')
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
