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
import { UI_LANGUAGES, UI_LANGUAGE_ENDONYMS, type UiLanguage } from '../../src/i18n/languages'
import fr from '../../src/i18n/messages/fr/app'
import en from '../../src/i18n/messages/en/app'
import de from '../../src/i18n/messages/de/app'
import es from '../../src/i18n/messages/es/app'
import nl from '../../src/i18n/messages/nl/app'

/** Le domaine `app`, langue par langue : c'est lui qui porte les deux mentions. */
const CATALOGS = { fr, en, de, es, nl } as const

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

/**
 * # Les deux mentions doivent dire de quel axe elles parlent
 *
 * Le défaut se produit à la seconde où un sélecteur d'interface existe, et il n'existait
 * pas avant : le pilote change la langue de l'interface, lit dans le bandeau du fichier
 * « LIBELLÉS — fr » inchangé, et conclut que le sélecteur est cassé. Il a raison de le
 * croire tant que rien ne lui dit que ces deux mentions parlent de deux choses.
 *
 * Ces tests gardent donc une propriété du **texte** : chacune des deux mentions nomme son
 * axe, dans les cinq langues. Un intitulé raccourci à « Libellés » les ferait tomber.
 */
describe('les deux mentions nomment leur axe', () => {
  it('la mention des libellés nomme XCTrack, dans les cinq langues', () => {
    for (const language of UI_LANGUAGES) {
      const app = CATALOGS[language]
      expect(app['app.metaLabels'], language).toContain('XCTrack')
    }
  })

  it('la mention de l’interface nomme l’interface, jamais les libellés', () => {
    // Chaque langue emploie son propre mot — Oberfläche, interfaz, interface : on vérifie
    // qu'il est là, et surtout que « XCTrack » ne l'est PAS. Un sélecteur intitulé
    // « Langue de XCTrack » dirait exactement le contraire de ce qu'il fait.
    const words: Record<UiLanguage, string> = {
      fr: 'interface', en: 'Interface', de: 'Oberfläche', es: 'interfaz', nl: 'interface'
    }
    for (const language of UI_LANGUAGES) {
      const app = CATALOGS[language]
      expect(app['app.uiLanguage'], language).toContain(words[language])
      expect(app['app.uiLanguage'], language).not.toContain('XCTrack')
    }
  })

  it('le sélecteur dit, dans les cinq langues, qu’il ne touche pas aux libellés', () => {
    // C'est la phrase qui désamorce le doute avant qu'il naisse. Elle nomme XCTrack : sans
    // ce mot, elle parlerait de « labels » en général, ce que le pilote ne rattacherait à
    // rien de ce qu'il voit.
    for (const language of UI_LANGUAGES) {
      expect(CATALOGS[language]['app.uiLanguageHint'], language).toContain('XCTrack')
    }
    // Et la section des libellés les rattache à l'appareil du pilote — c'est ce qui rend
    // concret le fait qu'ils ne nous appartiennent pas.
    const devices: Record<UiLanguage, string> = {
      fr: 'instrument', en: 'instrument', de: 'Gerät', es: 'instrumento', nl: 'instrument'
    }
    for (const language of UI_LANGUAGES) {
      expect(CATALOGS[language]['app.labelsAxisLead'], language).toContain(devices[language])
    }
  })

  it('les cinq entrées du sélecteur sont des endonymes', () => {
    // « Nederlands », jamais « Néerlandais » : demander de reconnaître un mot français
    // pour sortir du français rate exactement la personne qu'il faut aider. Ils ne sont
    // donc PAS dans le catalogue — ils ne dépendent pas de la langue courante.
    expect(UI_LANGUAGE_ENDONYMS.nl).toBe('Nederlands')
    expect(UI_LANGUAGE_ENDONYMS.de).toBe('Deutsch')
    for (const language of UI_LANGUAGES) {
      const values = Object.values(CATALOGS[language]) as unknown[]
      const flat = values.flatMap((v) => typeof v === 'string' ? [v] : Object.values(v as object))
      for (const endonym of Object.values(UI_LANGUAGE_ENDONYMS)) {
        expect(flat, `${language} / ${endonym}`).not.toContain(endonym)
      }
    }
  })
})
