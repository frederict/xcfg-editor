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
    const values = { count: 2, shown: 3, total: 5 }
    const de = await loadTranslator('de')
    const es = await loadTranslator('es')
    const fr5 = await loadTranslator('fr')

    // L'allemand renvoie son verbe à la fin de la subordonnée…
    expect(de.t('pages.hiddenOffFlight', values)).toBe(
      '2 Seiten werden außerhalb des Flugkontexts ausgeblendet: '
      + 'am Boden zeigt das Gerät nur 3 von 5 an.'
    )
    // …et les trois nombres restent chacun à leur place dans les trois langues.
    expect(fr5.t('pages.hiddenOffFlight', values)).toContain('que 3 sur 5')
    expect(es.t('pages.hiddenOffFlight', values)).toContain('muestra 3 de 5')
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
    // @ts-expect-error — repère manquant dans une phrase qui en attend trois
    expect(() => tr.t('pages.hiddenOffFlight', { count: 2, shown: 3 })).toBeDefined()
  })
})
