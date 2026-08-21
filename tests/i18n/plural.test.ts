import { describe, expect, it } from 'vitest'
import { UI_LANGUAGES, type UiLanguage } from '../../src/i18n/languages'
import { pluralCategory, pluralForm, type PluralForms } from '../../src/i18n/plural'

/**
 * Le dépôt portait huit copies de `plural()`, toutes écrites `count > 1` — la règle
 * française et elle seule. Ces tests vérifient ce que cette écriture rendait faux, et
 * d'abord **le zéro**, explicitement, dans les cinq langues.
 */

/** « 0 réglage » en français, « 0 settings » ailleurs — la phrase du relevé de langue. */
const SETTING: Readonly<Record<UiLanguage, PluralForms>> = {
  fr: { one: 'réglage', other: 'réglages' },
  en: { one: 'setting', other: 'settings' },
  nl: { one: 'instelling', other: 'instellingen' },
  de: { one: 'Einstellung', other: 'Einstellungen' },
  es: { one: 'ajuste', other: 'ajustes' }
}

describe('pluriel', () => {
  it('met zéro au singulier en français, et au pluriel dans les quatre autres', () => {
    expect(pluralForm(SETTING.fr, 0, 'fr')).toBe('réglage')
    expect(pluralForm(SETTING.en, 0, 'en')).toBe('settings')
    expect(pluralForm(SETTING.nl, 0, 'nl')).toBe('instellingen')
    expect(pluralForm(SETTING.de, 0, 'de')).toBe('Einstellungen')
    expect(pluralForm(SETTING.es, 0, 'es')).toBe('ajustes')
  })

  it('c’est exactement ce que « count > 1 » rendait faux', () => {
    // L'ancienne écriture, reproduite ici pour montrer l'écart qu'elle produisait.
    const oldRule = (count: number, forms: PluralForms): string =>
      count > 1 ? forms.other : forms.one

    expect(oldRule(0, SETTING.fr)).toBe(pluralForm(SETTING.fr, 0, 'fr'))
    for (const language of ['en', 'nl', 'de', 'es'] as const) {
      expect(oldRule(0, SETTING[language])).not.toBe(pluralForm(SETTING[language], 0, language))
    }
  })

  it('met un au singulier et deux au pluriel dans les cinq langues', () => {
    for (const language of UI_LANGUAGES) {
      expect(pluralForm(SETTING[language], 1, language)).toBe(SETTING[language].one)
      expect(pluralForm(SETTING[language], 2, language)).toBe(SETTING[language].other)
    }
  })

  it('replie sur « other » les catégories qu’un message ne fournit pas', () => {
    // Le français et l'espagnol classent le million en `many` (CLDR 42+), sans qu'aucune
    // forme change pour autant : le repli est juste, et ne devient un manque que le jour
    // où une langue à six formes entre dans le jeu.
    expect(pluralCategory(1_000_000, 'fr')).toBe('many')
    expect(pluralCategory(1_000_000, 'es')).toBe('many')
    expect(pluralForm(SETTING.fr, 1_000_000, 'fr')).toBe('réglages')
    expect(pluralForm(SETTING.es, 1_000_000, 'es')).toBe('ajustes')
  })

  it('emploie la forme fournie quand elle existe', () => {
    const forms: PluralForms = { one: 'un', other: 'plusieurs', many: 'une multitude' }
    expect(pluralForm(forms, 1_000_000, 'fr')).toBe('une multitude')
    expect(pluralForm(forms, 2, 'fr')).toBe('plusieurs')
  })

  it('les cinq langues n’ont que deux formes utiles', () => {
    // Aucune n'exige le duel ni les formes slaves : c'est ce qui rend `one` / `other`
    // suffisant, et il vaut mieux que ce soit un test qu'une note de bas de page.
    for (const language of UI_LANGUAGES) {
      const used = new Set([0, 1, 2, 3, 11, 21, 100, 1000].map((n) => pluralCategory(n, language)))
      expect([...used].sort()).toEqual(['one', 'other'])
    }
  })
})
