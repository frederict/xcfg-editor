import { describe, expect, it } from 'vitest'
import { UI_LANGUAGE_KEY, initialUiLanguage, writeUiLanguage } from '../../src/i18n/preference'
import { catalogLanguage } from '../../src/catalog/widgetCatalog'
import { loadTranslator, makeTranslator } from '../../src/i18n/translate'
import { labelFallbackLanguage, resolveLanguage } from '../../src/model/preferences'
import { UI_LANGUAGES, UI_LANGUAGE_ENDONYMS, type UiLanguage } from '../../src/i18n/languages'
import { drawButtonNavig } from '../../src/render/widgets/buttons'
import type { RenderSettings } from '../../src/model/preferences'
import type { Widget } from '../../src/model/widget'
import fr from '../../src/i18n/messages/fr/app'
import en from '../../src/i18n/messages/en/app'
import de from '../../src/i18n/messages/de/app'
import es from '../../src/i18n/messages/es/app'
import nl from '../../src/i18n/messages/nl/app'
import frenchMessages from '../../src/i18n/messages/fr'
import germanMessages from '../../src/i18n/messages/de'

/** Le domaine `app`, langue par langue : c'est lui qui porte les deux mentions. */
const CATALOGS = { fr, en, de, es, nl } as const

function fakeStorage(): Storage {
  const held = new Map<string, string>()
  return {
    length: 0, clear: () => {}, key: () => null, removeItem: () => {},
    getItem: (key: string) => held.get(key) ?? null,
    setItem: (key: string, value: string) => { held.set(key, value) }
  } as Storage
}

/**
 * Le cas qui décide : un pilote belge dont l'AIR³ est réglé en anglais lit l'interface en
 * français **et** les libellés en anglais. Brancher les deux sur un même sélecteur
 * casserait la promesse centrale de l'outil — ne pas obliger le pilote à traduire
 * mentalement entre son instrument et cet écran.
 *
 * ⚠️ **Ces tests portaient jusqu'au 2026-08-22 sur un modèle mort.** `src/i18n/axes.ts`
 * exposait alors un type `LanguageAxes` et cinq fonctions qu'aucun module n'appelait, et
 * cinq des tests ci-dessous ne faisaient qu'exercer ces cinq fonctions : ils étaient verts
 * quoi que fasse le code vivant. Ils portent maintenant sur les modules qui tiennent
 * réellement les deux axes — `resolveLanguage`, `labelFallbackLanguage`, `catalogLanguage`,
 * le socle de notre prose, et `src/render/`, la couche où les deux se croisent.
 */
describe('les deux axes de langue', () => {
  it('le pilote belge : le fichier commande les libellés, le globe commande la prose', () => {
    // L'axe `labels` : la déclaration du fichier passe avant toute supposition.
    expect(resolveLanguage({ kind: 'explicit', code: 'en' }, 'fr-BE')).toBe('en')
    // L'axe `ui` : il ne lit pas le fichier, il lit ce que le pilote a mémorisé.
    const storage = fakeStorage()
    writeUiLanguage(storage, 'fr')
    expect(initialUiLanguage(storage, ['en-GB'])).toBe('fr')
  })

  it('changer la langue de l’interface ne touche pas celle des libellés', () => {
    // `resolveLanguage` ne connaît que deux choses, et la langue d'interface n'en est pas :
    // aucun de ses arguments ne peut porter le choix du globe quand le fichier a parlé.
    for (const ui of UI_LANGUAGES) {
      expect(resolveLanguage({ kind: 'explicit', code: 'en' }, ui)).toBe('en')
    }
  })

  it('ouvrir un fichier qui déclare une autre langue ne touche pas l’interface', () => {
    // Le seul écrivain de l'axe `ui` est le sélecteur, et il n'écrit qu'une clé.
    const storage = fakeStorage()
    writeUiLanguage(storage, 'nl')
    // Ouvrir un fichier tchèque : c'est `resolveLanguage` qui bouge, pas `localStorage`.
    expect(resolveLanguage({ kind: 'explicit', code: 'cs' }, 'nl')).toBe('cs')
    expect(initialUiLanguage(storage, ['cs'])).toBe('nl')
  })

  it('les libellés vont bien au-delà de nos cinq langues', () => {
    // 33 à 35 selon le catalogue. Restreindre l'axe des libellés à nos cinq langues
    // priverait un pilote tchèque des mots que son instrument lui montre en vol.
    expect(catalogLanguage('cs')).toBe('cs')
    expect(catalogLanguage('ja')).toBe('ja')
  })

  it('les deux axes ont des replis différents, et c’est voulu', () => {
    // Notre prose retombe sur le **français**, sa langue d'écriture ; les catalogues de
    // l'APK retombent sur l'**anglais**, la seule langue complète du binaire.
    expect(initialUiLanguage(fakeStorage(), ['cs'])).toBe('fr')
    expect(catalogLanguage('xx')).toBe('en')
  })

  it('le repli des libellés suit le choix du pilote, jamais sa langue d’interface', () => {
    // Un pilote tchèque qui n'a rien choisi : son interface est en français (repli), et
    // ses libellés doivent rester tchèques. Passer la langue courante les franciserait.
    expect(labelFallbackLanguage(undefined, 'cs')).toBe('cs')
    // Un pilote qui a choisi l'anglais au globe : c'est lui qui l'emporte sur le navigateur.
    expect(labelFallbackLanguage('en', 'fr-FR')).toBe('en')
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
})

/**
 * # La couche où les deux axes se croisent pour de bon
 *
 * `src/render/` dessine l'écran d'un instrument : tout ce qu'il peint suit l'axe `labels`.
 * Mais il **ajoute** au dessin deux étiquettes de survol qui ne sont pas sur l'appareil,
 * et celles-là sont notre prose. C'est le seul endroit du dépôt où une même fonction
 * reçoit les deux axes, sous deux noms — `language` et `tr`.
 *
 * Ces tests tiennent la séparation dans les deux sens. Ils seraient rouges sur le code
 * d'avant le 2026-08-22, où `hoverLabel` lisait la langue du fichier.
 */
describe('le rendu reçoit les deux axes et ne les confond pas', () => {
  const settings: RenderSettings = {
    fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
    titleSizePercent: 100, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
    altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
    windSpeedUnit: 'km/h', distanceUnit: 'km', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
  }
  const bouton: Widget = {
    node: {
      kind: 'object',
      entries: [['"type"', { kind: 'string', raw: '"ACTION_NEXT_WAYPOINT"' }]]
    },
    className: 'org.xcontest.XCTrack.widget.w.WButtonNavig',
    shortName: 'WButtonNavig', x1: 0, y1: 0, x2: 1000, y2: 1000,
    border: false, background: 100, theme: ''
  }

  it('l’étiquette de survol suit le pilote, pas le fichier', () => {
    const français = makeTranslator('fr', frenchMessages)
    const allemand = makeTranslator('de', germanMessages)
    expect(drawButtonNavig(bouton, settings, 'de', français).title).toContain('balise suivante')
    expect(drawButtonNavig(bouton, settings, 'fr', allemand).title).toContain('nächster Wegpunkt')
  })
})

/**
 * # Le document doit dire vrai sur le code vivant
 *
 * `src/i18n/axes.ts` est cité en docblock par une quinzaine de modules : c'est le texte le
 * plus lu du dépôt, et c'est pour cela qu'il n'a pas été supprimé quand son API l'a été.
 * Un document que rien ne garde dérive — c'est précisément ce qui lui est arrivé, et ce
 * que la revue du 22 août 2026 a relevé.
 *
 * Ces tests ne jugent pas sa prose. Ils vérifient qu'il ne nomme aucun symbole ni aucun
 * fichier qui n'existe plus, et qu'il n'a pas ressuscité l'API morte.
 */
describe('le document des deux axes ne peut plus dériver', () => {
  /** Tous les modules du dépôt, chemin relatif à la racine → source — comme `tests/docs/`. */
  const MODULES: Record<string, string> = Object.fromEntries(
    Object.entries(
      import.meta.glob<string>('../../src/**/*.ts', { eager: true, query: '?raw', import: 'default' })
    ).map(([key, source]) => [key.replace('../../', ''), source])
  )
  const AXES = MODULES['src/i18n/axes.ts']!

  it('n’expose plus aucune API : c’est un document, et il le dit', () => {
    expect(AXES).not.toMatch(/export (function|interface|const|type) /)
    expect(AXES).toContain('export {}')
    // Les cinq noms morts ne doivent pas revenir autrement que dans le récit de leur
    // suppression, qui les cite sous les guillemets d'un `code` Markdown.
    for (const nom of ['languageAxes', 'withUiLanguage', 'withLabelLanguage', 'initialAxes']) {
      expect(AXES.includes(`export function ${nom}`), nom).toBe(false)
    }
  })

  it('ne nomme que des modules qui existent', () => {
    const chemins = [...AXES.matchAll(/`(src\/[\w/]+\.ts)`/g)].map((m) => m[1]!)
    expect(chemins.length).toBeGreaterThan(3)
    for (const chemin of new Set(chemins)) {
      expect(MODULES[chemin], `${chemin} cité par axes.ts`).toBeTypeOf('string')
    }
  })

  it('ne nomme que des symboles qui existent, là où il dit qu’ils sont', () => {
    // Chaque ligne du tableau « où la doctrine s'applique » nomme une fonction et son
    // fichier. Si l'un des deux bouge, ce test tombe — et le document est corrigé avec.
    const attendus: Array<[string, string]> = [
      ['resolveLanguage', 'src/model/preferences.ts'],
      ['labelFallbackLanguage', 'src/model/preferences.ts'],
      ['LabelSource', 'src/ui/main.ts'],
      ['labelFallback', 'src/ui/main.ts'],
      ['catalogLanguage', 'src/catalog/widgetCatalog.ts'],
      ['Translator', 'src/i18n/translate.ts']
    ]
    for (const [symbole, fichier] of attendus) {
      expect(AXES, `${symbole} doit être cité`).toContain(symbole)
      const source = MODULES[fichier]!
      expect(source, `${symbole} dans ${fichier}`).toMatch(
        new RegExp(`(export )?(function|type|interface|const) ${symbole}\\b`)
      )
    }
  })

  it('dit les trois sources de libellés, et le code en déclare exactement trois', () => {
    const main = MODULES['src/ui/main.ts']!
    const déclaration = /type LabelSource = ([^\n]+)/.exec(main)?.[1] ?? ''
    const sources = [...déclaration.matchAll(/'([a-z]+)'/g)].map((m) => m[1]!)
    expect(sources.sort()).toEqual(['browser', 'file', 'ui'])
    for (const source of sources) expect(AXES, source).toContain(`\`${source}\``)
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
