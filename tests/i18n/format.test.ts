import { describe, expect, it } from 'vitest'
import { formatters } from '../../src/i18n/format'
import { UI_LANGUAGES } from '../../src/i18n/languages'

/**
 * Deux références, et pas une seule :
 *
 * 1. **la sortie française d'aujourd'hui**, que ce socle ne doit pas changer — un pilote
 *    francophone ne doit rien voir bouger le jour du branchement, à l'espace fine
 *    insécable près (voir `FINE` et l'en-tête de `src/i18n/format.ts`) ;
 * 2. **ce que les quatre autres langues attendent**, que le dépôt rendait faux — les
 *    unités d'octets et les noms de mois cassaient dans les quatre, la virgule décimale
 *    dans la seule anglaise.
 */

/**
 * L'espace fine insécable que `Intl` pose en français entre un nombre et son unité. Écrite
 * en échappement : dans un fichier source elle est indiscernable d'une espace ordinaire,
 * et c'est exactement le genre de test qu'on passe une heure à ne pas comprendre.
 */
const FINE = '\u202f'

/** L'espace insécable, que le français, l'allemand et l'espagnol posent devant « % ». */
const NBSP = '\u00a0'

describe('formateurs', () => {
  it('rend en français ce que le dépôt rend aujourd’hui, à l’espace près', () => {
    const fr = formatters('fr')
    // `preferencesPage.formatCount` / `versionDiagnostic.french()` : toLocaleString('fr-FR').
    // Identique au caractère près — ces deux-là passaient déjà par `Intl`.
    expect(fr.number(1059)).toBe((1059).toLocaleString('fr-FR'))
    // `views.formatMm` : value.toFixed(1).replace('.', ',')
    expect(fr.decimal(48.25, 1)).toBe('48,3')
    // `deviceSelector.formatInches` : le signe, pas l'abréviation « po ». Identique.
    expect(fr.inches(7.25)).toBe('7,25″')
    // `sharingDialog.formatByteSize` / `libraryPanel.formatByteSize` : mêmes chiffres,
    // mêmes unités, mais une espace **fine insécable** là où le dépôt en pose une
    // ordinaire. C'est le seul écart, et il empêche « 512 » et « o » de se retrouver sur
    // deux lignes.
    expect(fr.byteSize(512)).toBe(`512${FINE}o`)
    expect(fr.byteSize(80486)).toBe(`78,6${FINE}ko`)
    expect(fr.byteSize(1468006)).toBe(`1,4${FINE}Mo`)
    expect(fr.byteSize(11_000_000_000)).toBe(`10,2${FINE}Go`)
  })

  it('donne aux octets l’unité de la langue — ce que le dépôt figeait en « o / ko / Mo »', () => {
    expect(formatters('en').byteSize(80486)).toBe('78.6 kB')
    expect(formatters('nl').byteSize(80486)).toBe('78,6 kB')
    expect(formatters('de').byteSize(80486)).toBe('78,6 kB')
    expect(formatters('es').byteSize(80486)).toBe('78,6 kB')
    // Le nom de l'octet lui-même change aussi, et il n'est pas le même partout.
    expect(formatters('de').byteSize(512)).toBe('512 Byte')
    expect(formatters('es').byteSize(512)).toBe('512 B')
  })

  it('n’emploie la virgule décimale que là où la langue la veut', () => {
    // Le néerlandais, l'allemand et l'espagnol font comme le français ; seul l'anglais casse.
    expect(formatters('en').decimal(48.25, 1)).toBe('48.3')
    for (const language of ['fr', 'nl', 'de', 'es'] as const) {
      expect(formatters(language).decimal(48.25, 1)).toBe('48,3')
    }
  })

  it('sépare les milliers selon la langue, ou pas du tout', () => {
    expect(formatters('en').number(1059)).toBe('1,059')
    expect(formatters('de').number(1059)).toBe('1.059')
    expect(formatters('nl').number(1059)).toBe('1.059')
    // L'espagnol ne sépare pas sous 10 000 : c'est la règle de la langue, pas un oubli.
    expect(formatters('es').number(1059)).toBe('1059')
    expect(formatters('es').number(10590)).toBe('10.590')
  })

  it('pose l’espace devant le signe pour-cent là où la langue le demande', () => {
    expect(formatters('en').percent(0.32)).toBe('32%')
    expect(formatters('nl').percent(0.32)).toBe('32%')
    for (const language of ['fr', 'de', 'es'] as const) {
      expect(formatters(language).percent(0.32)).toBe(`32${NBSP}%`)
    }
  })

  it('écrit les mois dans la langue — ce que douze chaînes en dur interdisaient', () => {
    const when = new Date(Date.UTC(2026, 7, 3, 12, 0))
    expect(formatters('fr').date(when)).toContain('août')
    expect(formatters('en').date(when)).toContain('August')
    expect(formatters('nl').date(when)).toContain('augustus')
    expect(formatters('de').date(when)).toContain('August')
    expect(formatters('es').date(when)).toContain('agosto')
  })

  it('rend « undefined » pour une date absente ou illisible, jamais un texte', () => {
    // Le mot à afficher alors est de la prose : il vient du catalogue, pas d'ici.
    const fr = formatters('fr')
    expect(fr.dateTime('')).toBeUndefined()
    expect(fr.dateTime('pas une date')).toBeUndefined()
    expect(fr.dateTime(new Date(Number.NaN))).toBeUndefined()
    expect(fr.date('2026-08-03T12:00:00Z')).toBeDefined()
  })

  it('rend le même objet pour la même langue', () => {
    for (const language of UI_LANGUAGES) {
      expect(formatters(language)).toBe(formatters(language))
      expect(formatters(language).language).toBe(language)
    }
  })
})
