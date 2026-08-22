import { describe, expect, it } from 'vitest'
import fr from '../../src/i18n/messages/fr'
import { loadTranslator, makeTranslator } from '../../src/i18n/translate'
import { UI_LANGUAGES } from '../../src/i18n/languages'

describe('lecture d’un message', () => {
  it('rend un message figé tel quel', async () => {
    const tr = await loadTranslator('fr')
    expect(tr.t('action.redo')).toBe('Rétablir')
    expect(tr.t('common.unknownDate')).toBe('date inconnue')
  })

  it('remplace les repères nommés', async () => {
    const tr = await loadTranslator('fr')
    expect(tr.t('action.redoNamed', { what: 'Déplacer la page 3' }))
      .toBe('Rétablir : Déplacer la page 3')
  })

  it('choisit la forme du pluriel selon la langue, zéro compris', async () => {
    const attendu: Record<string, string> = {
      fr: '0 réglage',
      en: '0 settings',
      nl: '0 instellingen',
      de: '0 Einstellungen',
      es: '0 ajustes'
    }
    for (const language of UI_LANGUAGES) {
      const tr = await loadTranslator(language)
      expect(tr.t('preferences.settingCount', { count: 0 })).toBe(attendu[language])
    }
  })

  it('laisse le traducteur déplacer les mots autour des repères', async () => {
    // Un pas d'historique, quatre repères : le rang, les deux types et l'orientation.
    // L'exemple canonique était `pages.hiddenOffFlight`, une phrase que plus aucun écran
    // n'employait et dont l'affirmation — une classe de page masquerait au sol — a été
    // mesurée fausse le 22 août 2026. Elle est partie des cinq catalogues ; celui-ci la
    // remplace, et il a l'avantage d'être un message que l'application affiche vraiment.
    const values = { rank: 3, before: 'Vide', after: 'Compétition', orientation: 'Querformat' }
    const de = await loadTranslator('de')
    const es = await loadTranslator('es')
    const fr5 = await loadTranslator('fr')

    // L'allemand rejette son infinitif à la fin, et écrit ses guillemets en bas puis en haut…
    expect(de.t('pages.describeSetClass', values)).toBe(
      'Typ von Seite 3 ändern: „Vide“ → „Compétition“ (Querformat)'
    )
    // …le français garde le verbe en tête et écarte les siens d'une espace fine
    // insécable (U+202F), celle qui retient le chevron fermant en bout de ligne…
    expect(fr5.t('pages.describeSetClass', { ...values, orientation: 'paysage' }))
      .toBe('Changer le type de la page 3 : « Vide » → « Compétition » (paysage)')
    // …et l'espagnol colle les siens au mot.
    expect(es.t('pages.describeSetClass', { ...values, orientation: 'horizontal' }))
      .toBe('Cambiar el tipo de la página 3: «Vide» → «Compétition» (horizontal)')
  })

  it('remplace les 23 accords en ternaire par deux phrases entières', async () => {
    // `${n} absente${n > 1 ? 's' : ''} du fichier` : en espagnol ce n'est pas un « s »
    // qui change, c'est le premier mot de la phrase.
    const es = await loadTranslator('es')
    expect(es.t('preferences.absentFromFile', { count: 1 })).toBe('falta 1 línea en el archivo')
    expect(es.t('preferences.absentFromFile', { count: 2 })).toBe('faltan 2 líneas en el archivo')

    const de = await loadTranslator('de')
    expect(de.t('preferences.absentFromFile', { count: 1 })).toBe('1 Zeile fehlt in der Datei')
    expect(de.t('preferences.absentFromFile', { count: 2 })).toBe('2 Zeilen fehlen in der Datei')
  })

  it('met les nombres en forme, et recopie les chaînes telles quelles', async () => {
    const fr5 = await loadTranslator('fr')
    const en = await loadTranslator('en')

    // Un `number` suit la langue…
    expect(fr5.t('preferences.settingCount', { count: 1059 })).toBe('1 059 réglages')
    expect(en.t('preferences.settingCount', { count: 1059 })).toBe('1,059 settings')

    // …une `string` est recopiée telle quelle : c'est ce qui protège les identifiants,
    // « 100 030 » ne se retrouvant dans aucun fichier XCTrack.
    expect(fr5.t('action.redoNamed', { what: '100030' })).toBe('Rétablir : 100030')
  })

  it('passe les formateurs de la langue avec le traducteur', async () => {
    const tr = await loadTranslator('en')
    expect(tr.t('library.storedLine', {
      name: 'Amélie Exemple',
      size: tr.format.byteSize(80486),
      when: tr.format.dateTime('2026-08-03T12:32:00Z') ?? tr.t('common.unknownDate')
    })).toContain('78.6 kB')
  })

  it('emploie le mot du catalogue quand la date est illisible', async () => {
    const tr = await loadTranslator('nl')
    const when = tr.format.dateTime('') ?? tr.t('common.unknownDate')
    expect(when).toBe('datum onbekend')
  })

  it('laisse visible un repère que l’appelant n’a pas fourni', () => {
    // Impossible depuis TypeScript ; possible depuis un catalogue qui a dérivé. Le repère
    // reste à l'écran, laid et repérable, plutôt que de laisser une phrase amputée.
    const tr = makeTranslator('fr', { ...fr, 'action.redoNamed': 'Rétablir : {what} ({when})' })
    expect(tr.t('action.redoNamed', { what: 'x' })).toBe('Rétablir : x ({when})')
  })

  it('rend le même traducteur pour la même langue', async () => {
    for (const language of UI_LANGUAGES) {
      expect(loadTranslator(language)).toBe(loadTranslator(language))
      expect((await loadTranslator(language)).language).toBe(language)
    }
  })

  it('refuse à la compilation ce qu’un test ne verrait qu’à l’exécution', () => {
    const tr = makeTranslator('fr', fr)

    // @ts-expect-error — clé inconnue
    expect(() => tr.t('action.doesNotExist')).toBeDefined()
    // @ts-expect-error — la phrase attend `{what}`
    expect(() => tr.t('action.redoNamed')).toBeDefined()
    // @ts-expect-error — la phrase n'attend rien
    expect(() => tr.t('action.redo', { what: 'x' })).toBeDefined()
    // @ts-expect-error — un pluriel exige `count`, et il doit être un nombre
    expect(() => tr.t('preferences.settingCount', { count: 'deux' })).toBeDefined()
    // @ts-expect-error — repère manquant dans une phrase qui en attend quatre
    expect(() => tr.t('pages.describeSetClass', { rank: 2, before: 'Vide' })).toBeDefined()
  })
})
