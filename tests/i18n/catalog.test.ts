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
  ...UI_LANGUAGES.map((language) => `${language}/dock.countPair`),
  'de/app.metaFormat',
  'en/app.metaFormat',
  'en/dock.heightPixels',
  'nl/dock.heightPixels',
  'en/editor.duplicateKeys',
  'nl/editor.duplicateKeys',
  'es/editor.duplicateKeys',
  'en/editor.deleteKeys',
  'nl/editor.deleteKeys',
  /*
   * Domaine `widgets` (`properties.ts`, `widgetPalette.ts`, `widgetList.ts`). Onze cas,
   * trois causes, aucune traduction oubliée :
   *
   * - « Pro » est le **badge de XCTrack**, écrit ainsi dans les cinq langues ; « UTM » est
   *   un sigle international qui ne se traduit dans aucune ;
   * - « yards (yd) » en anglais, « type » / « types » en anglais et en néerlandais : le
   *   mot que la langue emploie réellement se trouve être celui du français ;
   * - l'allemand et l'espagnol, eux, disent bien « Typ » / « Typen » et « tipo » /
   *   « tipos » : la coïncidence n'est pas générale, d'où l'exception nominative.
   */
  ...UI_LANGUAGES.map((language) => `${language}/properties.coordUtm`),
  ...UI_LANGUAGES.map((language) => `${language}/palette.pro`),
  'en/properties.unitYard',
  'en/palette.typeCount',
  'nl/palette.typeCount',
  /*
   * Domaine `library` (`libraryPanel.ts`). Deux intitulés, une seule cause : le mot
   * anglais se trouve être le mot français. « Pages » nomme la ligne de la carte
   * d'identité, « Note » le champ du renommage — et la coïncidence n'existe que là :
   * l'allemand dit « Seiten » et « Notiz », l'espagnol « Páginas » et « Nota », le
   * néerlandais « Pagina’s » et « Notitie ».
   */
  'en/library.factPages',
  'en/library.fieldNote',
  /*
   * Domaine `pages` (`pageManager.ts`, `deviceSelector.ts`). Trois causes, aucune
   * traduction oubliée :
   *
   * - deux messages **sans un seul mot** : le pas d'historique, son point final et
   *   l'espace qui le sépare de la conséquence ;
   * - « Portrait » et « {count} page(s) » : l'anglais se trouve écrire ce que le
   *   français écrit, au singulier comme au pluriel, et dans les deux graphies de
   *   l'orientation — celle du titre et celle de l'incise « (portrait) » ;
   * - « Diagonale » : le mot allemand se trouve être le mot français.
   */
  ...UI_LANGUAGES.map((language) => `${language}/pages.announcement`),
  ...UI_LANGUAGES.map((language) => `${language}/pages.announcementWithAdvice`),
  'en/pages.portrait',
  'en/pages.portraitInline',
  'de/device.diagonalPlaceholder',
  'en/pages.pageCount',
  /*
   * Domaine `preferences` (`preferencesPage.ts`). Deux gabarits **sans un seul mot** :
   * une valeur abrégée suivie de sa longueur, et la nature d'une donnée personnelle
   * suivie de sa raison. Repères, points de suspension, parenthèses et tiret cadratin :
   * les cinq langues écrivent forcément la même chose.
   */
  ...UI_LANGUAGES.map((language) => `${language}/preferences.truncatedValue`),
  ...UI_LANGUAGES.map((language) => `${language}/preferences.privacyItemWhy`),
  /*
   * Domaine `sharing` (`sharingDialog.ts`, `warnings.ts`). Quatre cas, deux causes :
   *
   * - deux gabarits **sans un seul mot** — le nom accessible d'une carte de choix (un
   *   titre, un point, une note) et les quatre coordonnées d'un rectangle, qui portent
   *   les noms `X1`…`Y2` que le fichier écrit ;
   * - « Portrait » et « page » : le mot que l'anglais emploie réellement se trouve être
   *   celui du français. L'allemand dit « Hochformat » et « Seite », le néerlandais
   *   « Staand » et « pagina », l'espagnol « Vertical » et « página » — la coïncidence
   *   n'est donc pas générale, d'où l'exception nominative.
   */
  ...UI_LANGUAGES.map((language) => `${language}/sharing.choiceLabel`),
  ...UI_LANGUAGES.map((language) => `${language}/warnings.box`),
  'en/sharing.orientationPortrait',
  'en/warnings.where',
  /*
   * Domaine `model` (`src/model/`, `src/library/`, `src/catalog/`). Deux causes :
   *
   * - « Portrait » et « page » : le mot que l'anglais emploie réellement se trouve être
   *   celui du français. L'allemand dit « Hochformat » et « Seite », le néerlandais
   *   « Staand » et « pagina », l'espagnol « Vertical » et « página » — la coïncidence
   *   n'est donc pas générale, d'où l'exception nominative ;
   * - le repérage d'un constat de page, qui ne porte que ces deux mots-là.
   */
  'en/inspection.portrait',
  'en/inspection.wherePage'
])

/**
 * Les messages au pluriel dont le nombre **choisit la forme sans s'écrire**. Le cas est
 * rare et il se déclare un par un, comme les coïncidences ci-dessus : un pluriel qui
 * n'affiche pas son nombre est presque toujours un `{count}` oublié dans la traduction.
 *
 * Ces trois-là ne le sont pas, et ils viennent tous du domaine `pages` :
 *
 * - `pages.rankShift` — « Les pages 3 à 5 deviennent 4 à 6 » ne compte rien, elle nomme
 *   des rangs ; le nombre de pages décalées n'accorde que le verbe et l'article ;
 * - `pages.thermalAlreadyPresent` — « une page » / « des pages », sans chiffre ;
 * - `pages.thermalMultiple` — **deux** nombres, un seul écrit : `{total}` compte les
 *   pages d'assistant de thermique et s'affiche, tandis que `count` accorde la dernière
 *   phrase sur les pages **autres** que la cible supposée. Le pluriel ne peut donc pas
 *   suivre celui qui s'écrit.
 *
 * Le quatrième vient du domaine `sharing` :
 *
 * - `sharing.droppedIntro` — « Cette section entière reste chez vous » / « Ces sections
 *   entières restent chez vous ». Les sections écartées sont **listées juste en dessous**,
 *   avec leur nom et ce qu'elles emportent : réécrire leur nombre dans la phrase qui
 *   ouvre la liste ne renseignerait pas, il ferait compter deux fois.
 */
const PLURAL_WITHOUT_VISIBLE_COUNT: ReadonlySet<string> = new Set<string>([
  'pages.rankShift',
  'pages.thermalAlreadyPresent',
  'pages.thermalMultiple',
  'sharing.droppedIntro',
  /*
   * Le cinquième vient du domaine `model` :
   *
   * - `inspection.obsoleteKey` — le nombre de clés périmées accorde **cinq** mots de la
   *   phrase (« un réglage écrit » / « des réglages écrits », « le convertit » / « les
   *   convertit », « son nouveau nom » / « leur nouveau nom ») sans jamais s'écrire : les
   *   clés elles-mêmes sont listées juste après, avec leur nouveau nom. Écrire « 2 » en
   *   plus de `mapWidget_showOpenStreet → mapWidget_mapAppearance,
   *   mapWidget_showTerrain → mapWidget_mapAppearance` ferait compter deux fois.
   */
  'inspection.obsoleteKey',
  /*
   * Le sixième aussi :
   *
   * - `libraryError.recordBadFields` — « champ illisible » / « champs illisibles » : les
   *   champs sont **nommés** juste après (`byteLength, sha256`), et écrire « 2 » devant
   *   une liste de deux noms ferait compter deux fois. C'est une ligne technique, celle
   *   que le pilote recopie s'il signale le problème.
   */
  'libraryError.recordBadFields',
  /*
   * Le septième vient du domaine `sharing` :
   *
   * - `warnings.structureMissingKeys` — « la ligne X1 manque » / « les lignes CLASS, X1
   *   manquent » : les lignes absentes sont **nommées** dans la phrase même, et écrire
   *   « 2 » devant deux noms ferait compter deux fois.
   */
  'warnings.structureMissingKeys'
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
      if (PLURAL_WITHOUT_VISIBLE_COUNT.has(key)) continue
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

/**
 * # Les guillemets, et l'espace qui tient dedans
 *
 * Défaut vu en photographiant l'accueil, jamais par un test : `landing.returning` cite
 * « Fichier » avec des espaces ordinaires, et à la largeur naturelle du bloc — 512 px,
 * fenêtre de 1 380 — le `»` tombait **seul** au début de la ligne suivante. Ce n'est pas
 * un défaut de style : le catalogue portait 102 messages français dans ce cas, et le
 * navigateur n'a aucune raison de refuser une coupure là où on a écrit une espace
 * sécable.
 *
 * Le remède est typographique et vit dans le message : une **espace insécable** à
 * l'intérieur des chevrons. Le catalogue emploie l'espace **fine** insécable (U+202F),
 * celle qu'`Intl` pose déjà devant les unités françaises — « 512 o », « 155,0 mm ». Elle
 * rend le rendu que le français attend et ne se coupe pas. L'espace insécable ordinaire
 * (U+00A0) resterait correcte, et le contrôle l'accepte.
 *
 * ⚠ Les cinq langues ne partagent **pas** cette règle, et l'appliquer partout serait une
 * faute :
 *
 * | Langue | Guillemets | Espace intérieure |
 * |---|---|---|
 * | `fr` | « … » | insécable, obligatoire |
 * | `de` | „ … “ | aucune |
 * | `en` | “ … ” | aucune |
 * | `nl` | ‘ … ’ | aucune |
 * | `es` | « … » | aucune |
 *
 * Chaque langue est donc vérifiée pour ce qu'elle doit porter **et** pour ce qu'elle ne
 * doit pas : un `«` dans une phrase allemande serait un guillemet français égaré, une
 * espace dans un `« … »` espagnol une règle française appliquée de travers.
 */
describe('les guillemets ne se coupent pas en fin de ligne', () => {
  /** U+202F, l'espace fine insécable — celle qu'`Intl` emploie en français. */
  const FINE = '\u202f'
  /** U+00A0, l'espace insécable ordinaire. */
  const NBSP = '\u00a0'

  /** Toutes les valeurs d'une langue, aplaties, avec la clé qui les porte. */
  function valuesOf(language: UiLanguage): Array<[MessageKey, string]> {
    const catalog = CATALOGS[language]
    return KEYS.flatMap(
      key => textsOf(catalog[key]).map(text => [key, text] as [MessageKey, string])
    )
  }

  it('le français écrit une espace insécable dans ses chevrons', () => {
    for (const [key, text] of valuesOf('fr')) {
      // Parcours par unité de code : `[...text]` rendrait un index de point de code, qui
      // ne serait plus celui de `text[index + 1]` dès qu'un émoji traverse le message.
      for (let index = 0; index < text.length; index += 1) {
        const char = text[index]
        if (char === '«') {
          const after = text[index + 1]
          expect(
            after === FINE || after === NBSP,
            `fr / ${key} : « doit être suivi d’une espace insécable, pas de ${JSON.stringify(after)}`
          ).toBe(true)
        }
        if (char === '»') {
          const before = text[index - 1]
          expect(
            before === FINE || before === NBSP,
            `fr / ${key} : » doit être précédé d’une espace insécable, pas de ${JSON.stringify(before)}`
          ).toBe(true)
        }
      }
    }
  })

  it('le catalogue français s’en tient à la fine, celle des unités', () => {
    // Les deux espaces insécables sont correctes ; un catalogue qui les mélange rendrait
    // deux largeurs différentes dans la même phrase. Une seule est écrite partout.
    const quoted = valuesOf('fr').filter(([, text]) => text.includes('«'))
    expect(quoted.length).toBeGreaterThan(50)
    for (const [key, text] of quoted) {
      expect(text, `fr / ${key}`).not.toContain(NBSP + '»')
      expect(text, `fr / ${key}`).not.toContain('«' + NBSP)
    }
  })

  it('l’espagnol garde ses chevrons collés au mot', () => {
    for (const [key, text] of valuesOf('es')) {
      expect(text, `es / ${key}`).not.toMatch(/«[\s  ]/u)
      expect(text, `es / ${key}`).not.toMatch(/[\s  ]»/u)
    }
  })

  it('les trois langues sans chevrons n’en portent aucun', () => {
    for (const language of ['de', 'en', 'nl'] as const) {
      for (const [key, text] of valuesOf(language)) {
        expect(text, `${language} / ${key}`).not.toContain('«')
        expect(text, `${language} / ${key}`).not.toContain('»')
      }
    }
  })

  /**
   * **Rien de ce catalogue n'est interprété.** Les phrases sont posées dans la page par
   * `textContent`, jamais par un moteur Markdown : un accent grave s'affiche tel quel, et
   * le pilote lit « (`info.versionCode` absent) », accents graves compris.
   *
   * Le cas s'était déjà présenté pour les astérisques d'emphase — `src/model/inspection.ts`
   * porte le commentaire qui raconte leur retrait. Les accents graves ont survécu à cette
   * relecture-là dans cinq messages, soit soixante valeurs sur les cinq langues, toutes
   * dans les remarques sur le fichier : c'est précisément là qu'un pilote-testeur a dit
   * sauter les lignes, le 2026-08-22.
   *
   * Ce test ne dit rien du **nom** ainsi cité, qui reste souvent le renseignement exact
   * dont quelqu'un aura besoin ; il dit seulement qu'on ne l'habille pas d'une syntaxe
   * que rien ne rendra.
   */
  it('n’écrit aucune syntaxe Markdown que rien ne rendra', () => {
    for (const language of UI_LANGUAGES) {
      for (const [key, text] of valuesOf(language)) {
        expect(text, `${language} / ${key}`).not.toContain('`')
        expect(text, `${language} / ${key}`).not.toMatch(/\*\*/u)
      }
    }
  })

  it('aucune langue ne colle une espace à l’intérieur de ses propres guillemets', () => {
    // „ … “ en allemand, “ … ” en anglais, ‘ … ’ en néerlandais : l'ouvrant colle au mot
    // qui suit, le fermant au mot qui précède.
    const pairs: Readonly<Record<'de' | 'en' | 'nl', readonly [string, string]>> = {
      de: ['„', '“'], en: ['“', '”'], nl: ['‘', '’']
    }
    for (const language of ['de', 'en', 'nl'] as const) {
      const [open, close] = pairs[language]
      for (const [key, text] of valuesOf(language)) {
        expect(text, `${language} / ${key}`).not.toContain(open + ' ')
        expect(text, `${language} / ${key}`).not.toContain(' ' + close)
      }
    }
  })
})
