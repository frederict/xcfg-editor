import { describe, expect, it } from 'vitest'
import {
  initialAxes,
  languageAxes,
  withLabelLanguage,
  withUiLanguage
} from '../../src/i18n/axes'
import { UI_LANGUAGE_KEY, initialUiLanguage, writeUiLanguage } from '../../src/i18n/preference'
import { catalogLanguage } from '../../src/catalog/widgetCatalog'
import { loadTranslator } from '../../src/i18n/translate'

/**
 * Le cas qui décide : un pilote belge dont l'AIR³ est réglé en anglais lit l'interface en
 * français **et** les libellés en anglais. Brancher les deux sur un même sélecteur
 * casserait la promesse centrale de l'outil — ne pas obliger le pilote à traduire
 * mentalement entre son instrument et cet écran.
 *
 * Ces tests ne vérifient pas une intention : ils vérifient qu'aucun chemin de code ne
 * peut faire bouger un axe en touchant l'autre.
 */
describe('les deux axes de langue', () => {
  it('le pilote belge : interface en français, libellés en anglais', () => {
    const axes = languageAxes('fr', 'en')
    expect(axes.ui).toBe('fr')
    expect(axes.labels).toBe('en')
  })

  it('changer la langue de l’interface ne touche pas celle des libellés', () => {
    const axes = languageAxes('fr', 'en')
    expect(withUiLanguage(axes, 'nl').labels).toBe('en')
    expect(withUiLanguage(axes, 'de').labels).toBe('en')
    // Et l'objet de départ n'a pas bougé : rien n'est modifié en place.
    expect(axes.ui).toBe('fr')
  })

  it('ouvrir un fichier qui déclare une autre langue ne touche pas l’interface', () => {
    const axes = languageAxes('fr', 'en')
    expect(withLabelLanguage(axes, 'cs').ui).toBe('fr')
    expect(withLabelLanguage(axes, 'cs').labels).toBe('cs')
    expect(axes.labels).toBe('en')
  })

  it('les libellés vont bien au-delà de nos cinq langues', () => {
    // 33 à 35 selon le catalogue. Restreindre l'axe des libellés à nos cinq langues
    // priverait un pilote tchèque des mots que son instrument lui montre en vol.
    const axes = languageAxes('en', 'cs')
    expect(catalogLanguage(axes.labels)).toBe('cs')
    expect(catalogLanguage('ja')).toBe('ja')
  })

  it('les deux axes ont des replis différents, et c’est voulu', () => {
    // Notre prose retombe sur le **français**, sa langue d'écriture ; les catalogues de
    // l'APK retombent sur l'**anglais**, la seule langue complète du binaire.
    const storage = new Map<string, string>()
    const fake = {
      length: 0, clear: () => {}, key: () => null, removeItem: () => {},
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) }
    } as Storage

    expect(initialUiLanguage(fake, ['cs'])).toBe('fr')
    expect(catalogLanguage('xx')).toBe('en')
  })

  it('le choix mémorisé ne concerne que l’interface', () => {
    // Le module de persistance n'a aucun accès à la langue des libellés : elle vient du
    // fichier ouvert et change avec lui, elle n'a rien à mémoriser.
    const written = new Map<string, string>()
    const fake = {
      length: 0, clear: () => {}, key: () => null, removeItem: () => {},
      getItem: (key: string) => written.get(key) ?? null,
      setItem: (key: string, value: string) => { written.set(key, value) }
    } as Storage

    writeUiLanguage(fake, 'nl')
    expect([...written.keys()]).toEqual([UI_LANGUAGE_KEY])
    expect(UI_LANGUAGE_KEY).toContain('ui-language')
  })

  it('un traducteur ne porte que l’axe de l’interface', async () => {
    // Rien dans le traducteur ne nomme la langue des libellés : il ne peut donc pas la
    // décider par mégarde.
    const tr = await loadTranslator('fr')
    expect(tr.language).toBe('fr')
    expect(Object.keys(tr).sort()).toEqual(['format', 'language', 't'])
  })

  it('le premier écran : prose mémorisée ou détectée, libellés du navigateur', () => {
    const axes = initialAxes('nl', 'fr-BE')
    expect(axes.ui).toBe('nl')
    // La langue des libellés reste **brute** : c'est à chaque catalogue de la replier, et
    // le repli n'est pas le même de l'un à l'autre.
    expect(axes.labels).toBe('fr-BE')
    expect(initialAxes(undefined, 'cs').ui).toBe('fr')
  })
})
