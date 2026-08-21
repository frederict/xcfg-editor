import { describe, expect, it } from 'vitest'
import {
  UI_LANGUAGE_KEY,
  detectUiLanguage,
  initialUiLanguage,
  readUiLanguage,
  writeUiLanguage
} from '../../src/i18n/preference'
import { UI_LANGUAGES, uiLanguage } from '../../src/i18n/languages'

/** Un `Storage` de test, avec la possibilité de le faire lever comme un vrai. */
function fakeStorage(initial: Record<string, string> = {}, throws = false): Storage {
  const map = new Map(Object.entries(initial))
  const guard = <T>(run: () => T): T => {
    if (throws) throw new DOMException('stockage refusé')
    return run()
  }
  return {
    get length() { return map.size },
    clear: () => guard(() => { map.clear() }),
    getItem: (key: string) => guard(() => map.get(key) ?? null),
    key: (index: number) => guard(() => [...map.keys()][index] ?? null),
    removeItem: (key: string) => guard(() => { map.delete(key) }),
    setItem: (key: string, value: string) => guard(() => { map.set(key, value) })
  }
}

describe('langue de l’interface', () => {
  it('ramène une étiquette régionale à l’une des cinq langues', () => {
    expect(uiLanguage('fr-BE')).toBe('fr')
    expect(uiLanguage('de-AT')).toBe('de')
    expect(uiLanguage('NL')).toBe('nl')
    expect(uiLanguage('es-419')).toBe('es')
    expect(uiLanguage('cs')).toBeUndefined()
  })

  it('ne confond pas une langue voisine avec un préfixe', () => {
    // `startsWith('es')` accepterait l'estonien, `startsWith('de')` accepterait le `den`.
    // Le mauvais appariement afficherait toute l'interface dans la mauvaise langue.
    expect(uiLanguage('est')).toBeUndefined()
    expect(uiLanguage('deu')).toBeUndefined()
    expect(uiLanguage('enm')).toBeUndefined()
  })

  it('suit l’ordre de préférence du système, pas seulement la première langue', () => {
    // Un pilote belge règle souvent son système en `nl-BE, fr-BE, en-US`.
    expect(detectUiLanguage(['nl-BE', 'fr-BE', 'en-US'])).toBe('nl')
    // Une première langue que nous n'avons pas ne doit pas mener au repli : la deuxième
    // est un choix du pilote, elle aussi.
    expect(detectUiLanguage(['cs', 'de-AT', 'en'])).toBe('de')
    expect(detectUiLanguage(['cs', 'pl'])).toBeUndefined()
    expect(detectUiLanguage([])).toBeUndefined()
  })

  it('préfère le choix mémorisé à la langue du navigateur', () => {
    const storage = fakeStorage({ [UI_LANGUAGE_KEY]: 'es' })
    expect(initialUiLanguage(storage, ['nl-BE', 'fr-BE'])).toBe('es')
  })

  it('détecte au premier lancement, et retombe sur le français', () => {
    expect(initialUiLanguage(fakeStorage(), ['de-AT'])).toBe('de')
    expect(initialUiLanguage(fakeStorage(), ['cs', 'pl'])).toBe('fr')
    expect(initialUiLanguage(fakeStorage(), [])).toBe('fr')
  })

  it('mémorise le choix, et le relit', () => {
    const storage = fakeStorage()
    for (const language of UI_LANGUAGES) {
      writeUiLanguage(storage, language)
      expect(readUiLanguage(storage)).toBe(language)
    }
  })

  it('ignore un enregistrement qui n’est plus une de nos langues', () => {
    // Une version antérieure a pu écrire une langue depuis retirée, ou la valeur a pu
    // être éditée à la main : elle est ignorée, pas appliquée.
    expect(readUiLanguage(fakeStorage({ [UI_LANGUAGE_KEY]: 'cs' }))).toBeUndefined()
    expect(readUiLanguage(fakeStorage({ [UI_LANGUAGE_KEY]: '' }))).toBeUndefined()
    expect(readUiLanguage(fakeStorage())).toBeUndefined()
  })

  it('survit à un stockage qui refuse — navigation privée verrouillée', () => {
    const refusing = fakeStorage({}, true)
    expect(readUiLanguage(refusing)).toBeUndefined()
    expect(() => { writeUiLanguage(refusing, 'de') }).not.toThrow()
    // La langue reste appliquée pour la session ; elle ne survivra pas au rechargement.
    expect(initialUiLanguage(refusing, ['de-AT'])).toBe('de')
  })
})
