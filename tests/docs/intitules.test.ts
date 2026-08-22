import { describe, expect, it } from 'vitest'
import { UI_LANGUAGES, type UiLanguage } from '../../src/i18n/languages'
import de from '../../src/i18n/messages/de'
import en from '../../src/i18n/messages/en'
import es from '../../src/i18n/messages/es'
import fr from '../../src/i18n/messages/fr'
import nl from '../../src/i18n/messages/nl'

/**
 * # Un intitulé cité par la documentation doit exister quelque part
 *
 * ## Ce que ce test répare
 *
 * En une nuit, la documentation a cité **« Ce qui sera remplacé »** comme intitulé d'un
 * écran — aucun catalogue ne l'a jamais porté, le vrai est « Vos textes dans les
 * gadgets » ; **« Masquée hors vol »**, marque retirée le jour même ; **« Libellés »**,
 * renommé « Libellés de XCTrack » pendant la rédaction du chapitre qui le citait. Trois
 * agents ont redécouvert le premier cas indépendamment, chacun en cherchant l'écran que
 * la phrase promettait.
 *
 * Aucun de ces trois n'est une faute d'attention : la phrase était vraie quand elle a été
 * écrite, et le monde a bougé autour d'elle. Une consigne de relecture ne peut rien contre
 * ça — personne ne relit dix fichiers à chaque commit. Un test, si.
 *
 * ## La convention qui le rend possible
 *
 * Le manuel entoure déjà chaque intitulé d'un `<span class="manual__ui">`. Ce n'est pas
 * qu'une affaire de style : **c'est la déclaration « ceci est un mot de l'interface, pas
 * ma prose »**, et c'est ce que ce test lit. Citer un intitulé sans ce balisage le sort du
 * contrôle ; l'employer pour un mot qui n'est pas un intitulé fait échouer le test. Les
 * deux sont des erreurs, et la seconde se voit tout de suite.
 *
 * Le `README.md` n'a pas de balisage : il est en Markdown. La convention y est donc
 * **typographique**, et elle existait déjà — un intitulé se cite entre les guillemets de
 * la langue (« … » en français et en espagnol, „ … “ en allemand, “ … ” en anglais,
 * ‘ … ’ en néerlandais) **avec sa majuscule initiale**. Ce test lit exactement ces
 * citations-là : une majuscule après le guillemet ouvrant dit « intitulé », une minuscule
 * dit « prose ». C'est ce qui distingue « Retirer » (un bouton) de « donner moins » (une
 * façon de parler), sans rien demander de plus à qui écrit.
 *
 * ## Où est la vérité
 *
 * Dans trois endroits, et trois seulement :
 *
 * 1. **les cinq catalogues de `src/i18n/messages/`** — notre prose, celle que nous
 *    écrivons ;
 * 2. **les catalogues extraits de l'APK** (`src/catalog/*.json`) — les libellés de
 *    XCTrack, que nous ne traduisons pas et que le pilote lit sur son appareil ;
 * 3. **le code de `src/ui/`, commentaires retirés** — quelques mots de l'interface sont
 *    des **noms** et non de la prose, donc jamais versés au catalogue : « Responsive »
 *    (`deviceSelector.ts`) en est un.
 *
 * Les **commentaires n'en font pas partie**, et c'est le point qui fait tout marcher :
 * « Masquée hors vol » survit aujourd'hui dans un commentaire de `pageManager.ts` qui
 * raconte son retrait, et « Ce qui sera remplacé » dans celui de `sharingDialog.ts`. Un
 * commentaire archive ; il n'affiche rien.
 *
 * Les **commentaires HTML des README** sortent du contrôle pour la même raison inverse :
 * ce sont les recettes de capture, qui citent le contenu d'une fixture — « Page 1 »,
 * « Jean Exemple » — et non des intitulés.
 *
 * ## Ce que ce test NE vérifie pas — à lire avant de lui faire confiance
 *
 * - **Que l'intitulé soit au bon endroit.** « Enregistrer » existe ; le chapitre qui le
 *   place dans le mauvais écran passe.
 * - **Que ce qui est décrit autour soit vrai.** Un intitulé juste dans une phrase fausse
 *   est invisible ici.
 * - **Les intitulés cités sans balisage ni majuscule.** Le test ne voit que ce qui se
 *   déclare.
 * - **Un intitulé cité seulement dans la prose d'un autre message.** Un message qui
 *   raconte « à l'import (« Remplacer tout ») … » suffit à faire passer « Remplacer
 *   tout », même si plus aucun bouton ne le porte. Refuser ce cas obligerait à distinguer
 *   les valeurs qui sont des intitulés de celles qui sont des phrases, ce qu'aucune
 *   donnée ne dit ; un garde-fou qui crie à tort est désactivé dans la semaine.
 * - **Les fragments trop courts.** Voir `MIN_LABEL_LENGTH` : un mot de moins de quatre
 *   caractères se retrouve partout et ne prouve rien.
 */

/** Les textes des cinq manuels, lus tels quels. */
const MANUALS = import.meta.glob<string>('../../docs-app/manuel.*.html', {
  eager: true,
  query: '?raw',
  import: 'default'
})

/** Les cinq README du dépôt. */
const READMES = import.meta.glob<string>('../../README*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
})

/**
 * Les catalogues extraits de l'APK : les libellés que le pilote lit sur son appareil.
 *
 * Les gros catalogues sont partitionnés par langue et n'ont pas à être lus en entier —
 * seules nos cinq langues d'interface sont citées par la documentation.
 */
const APK_CATALOGS = {
  ...import.meta.glob<string>('../../src/catalog/*.json', {
    eager: true,
    query: '?raw',
    import: 'default'
  }),
  ...import.meta.glob<string>('../../src/catalog/*/{fr,de,en,es,nl,base}.json', {
    eager: true,
    query: '?raw',
    import: 'default'
  })
}

/** Le code qui dessine l'interface : quelques intitulés y sont des noms, pas de la prose. */
const UI_SOURCES = import.meta.glob<string>('../../src/ui/**/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default'
})

const MESSAGES: Readonly<Record<UiLanguage, Record<string, unknown>>> = { fr, de, en, es, nl }

/**
 * En dessous de quoi un intitulé ne prouve rien. « + », « ? », « Pro » se retrouvent dans
 * n'importe quelle chaîne : les accepter d'office coûte moins cher qu'une alerte fausse.
 */
const MIN_LABEL_LENGTH = 4

/**
 * Ramène deux écritures d'un même texte à une seule.
 *
 * L'apostrophe typographique du catalogue et l'apostrophe droite du Markdown désignent le
 * même mot ; une insécable et une espace ordinaire aussi ; un intitulé replié sur deux
 * lignes dans le HTML est le même que sur une seule.
 */
function normalize(text: string): string {
  return text
    .replaceAll('’', "'")
    .replaceAll(' ', ' ')
    .replaceAll(' ', ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

/** Toutes les valeurs affichables d'un catalogue de messages, pluriels dépliés. */
function catalogValues(catalog: Record<string, unknown>): string[] {
  const values: string[] = []
  for (const value of Object.values(catalog)) {
    if (typeof value === 'string') values.push(value)
    else if (value !== null && typeof value === 'object') {
      for (const form of Object.values(value as Record<string, unknown>)) {
        if (typeof form === 'string') values.push(form)
      }
    }
  }
  return values
}

/** Toutes les chaînes d'un JSON, clés comprises : un libellé peut être l'une ou l'autre. */
function jsonStrings(source: string): string[] {
  return [...source.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) =>
    (match[1] ?? '').replaceAll('\\"', '"').replaceAll('\\n', '\n')
  )
}

/**
 * Les caractères qui ferment un intitulé dans une chaîne plus longue.
 *
 * Un guillemet, une parenthèse, un tiret cadratin, un repère nommé, un bord de chaîne :
 * tout cela **délimite**. Une lettre, non — et c'est le point de tout ce test. « Libellés »
 * apparaît dans « Libellés de XCTrack » ; le laisser passer parce qu'une espace le suit
 * rendrait le contrôle aveugle au renommage, qui est précisément le cas le plus fréquent.
 */
const BOUNDARY = /[«»„“”‘’"'()[\]{}—–·:;,!?…]/

/** Le texte d'un manuel, commentaires HTML retirés (ils ne sont pas affichés). */
function manual(language: UiLanguage): string {
  const source = MANUALS[`../../docs-app/manuel.${language}.html`]
  if (source === undefined) throw new Error(`docs-app/manuel.${language}.html manque`)
  return source.replaceAll(/<!--[\s\S]*?-->/g, '')
}

/** Le texte d'un README, commentaires HTML retirés — ce sont les recettes de capture. */
function readme(language: UiLanguage): string {
  const path = language === 'fr' ? '../../README.md' : `../../README.${language}.md`
  const source = READMES[path]
  if (source === undefined) throw new Error(`${path.slice(6)} manque`)
  return source.replaceAll(/<!--[\s\S]*?-->/g, '')
}

/**
 * Un module de `src/ui/`, commentaires retirés.
 *
 * Le `//` précédé de deux points est une URL, pas un commentaire — c'est le seul piège
 * réel de ce découpage grossier, et il suffit de l'écarter. Le résultat n'est pas du
 * TypeScript valide : il n'est jamais exécuté, seulement fouillé.
 */
function withoutComments(source: string): string {
  return source.replaceAll(/\/\*[\s\S]*?\*\//g, ' ').replaceAll(/(^|[^:'\"`\\])\/\/[^\n]*/g, '$1 ')
}

/**
 * Ce que l'application peut afficher, dans une langue donnée : notre prose plus les
 * libellés de XCTrack. Les deux axes de `src/i18n/axes.ts` se rejoignent ici, et seulement
 * ici — la documentation les cite côte à côte, sans marquer lequel est lequel.
 */
function displayableText(language: UiLanguage): {
  readonly texts: readonly string[]
  readonly patterns: readonly RegExp[]
} {
  const messages = catalogValues(MESSAGES[language]).map(normalize)
  const texts = [
    ...messages,
    ...Object.values(APK_CATALOGS).flatMap(jsonStrings).map(normalize),
    ...Object.values(UI_SOURCES).map((source) => normalize(withoutComments(source)))
  ]
  // Les repères nommés ne viennent que de **nos** messages : « Rang {index} sur {total} »
  // rend « Rang 4 sur 6 », qu'aucune recherche littérale ne trouverait. Un fichier de
  // code entier ne devient pas une expression rationnelle — ce serait sans objet, et le
  // premier `{` d'un bloc la rendrait invalide.
  const patterns = messages.filter(isUsefulPattern).map(toPattern)
  return { texts, patterns }
}

/**
 * Ce qu'un repère vaut, une fois rendu, **dans une citation de documentation** : un
 * nombre, un pourcentage, des points de suspension. Jamais une phrase.
 *
 * Le point est mesuré, pas supposé : sur les cinq manuels, les seuls intitulés à repère
 * cités valent « Rang 4 sur 6 », « Zoom 100 % », « Grille 48 × 29 », « Remettre ces 9
 * réglages », « Ouvrir « … » et les perdre ». Un `.+?` ouvert à tout, lui, transforme
 * `'{first} à {last}'` en `^.+? à .+?$` — qui accepte **n'importe quelle phrase contenant
 * le mot « à »**. C'est arrivé pendant l'écriture de ce test : quatre intitulés faux
 * passaient au vert par ce trou, dont ceux que le test venait de trouver.
 */
const RENDERED_PLACEHOLDER = String.raw`[^\s]{1,20}(?: ?%)?`

/**
 * Un message dont il ne reste presque rien une fois les repères ôtés ne prouve rien :
 * `'{done}.'` deviendrait « toute phrase finissant par un point ».
 */
function isUsefulPattern(text: string): boolean {
  if (!/\{[a-zA-Z]+\}/.test(text)) return false
  return text.replaceAll(/\{[a-zA-Z]+\}/g, '').trim().length >= MIN_LABEL_LENGTH
}

function toPattern(text: string): RegExp {
  const escaped = text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
  return new RegExp(`^${escaped.replaceAll(/\\\{[a-zA-Z]+\\\}/g, RENDERED_PLACEHOLDER)}$`)
}

/**
 * Les titres du manuel dans une langue : chapitres, sous-titres, titres d'encadré.
 *
 * Le README cite le manuel — « À lire avant de donner votre fichier à qui que ce soit »
 * est le titre de son premier encadré, pas un bouton de l'application. Ces titres-là sont
 * de la documentation, donc ils vieillissent comme elle : les mettre dans la vérité du
 * README, c'est faire tenir ensemble les deux textes. Ils ne servent **pas** au contrôle
 * du manuel lui-même, qui ne doit se mesurer qu'à l'application.
 */
function manualHeadings(language: UiLanguage): string[] {
  const source = manual(language)
  return [
    ...[...source.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)],
    ...[...source.matchAll(/<span class="manual__boxTitle">([\s\S]*?)<\/span>/g)]
  ].map((match) => normalize((match[1] ?? '').replaceAll(/<[^>]*>/g, '')))
}

const DISPLAYABLE = Object.fromEntries(
  UI_LANGUAGES.map((language) => [language, displayableText(language)])
) as Record<UiLanguage, ReturnType<typeof displayableText>>

/** Le fragment est-il **délimité** dans la chaîne, ou noyé au milieu d'un mot plus long ? */
function isDelimited(haystack: string, label: string): boolean {
  let index = haystack.indexOf(label)
  while (index !== -1) {
    const before = haystack.slice(0, index).trimEnd()
    const after = haystack.slice(index + label.length).trimStart()
    const openOk = before === '' || BOUNDARY.test(before.at(-1) ?? '')
    const closeOk = after === '' || BOUNDARY.test(after[0] ?? '')
    if (openOk && closeOk) return true
    index = haystack.indexOf(label, index + 1)
  }
  return false
}

/** L'intitulé existe-t-il dans ce que l'application peut afficher ? */
function exists(label: string, language: UiLanguage, alsoIn: readonly string[] = []): boolean {
  const wanted = normalize(label)
  if (wanted.length < MIN_LABEL_LENGTH) return true
  const { texts, patterns } = DISPLAYABLE[language]
  return (
    alsoIn.includes(wanted) ||
    texts.some((text) => text === wanted || isDelimited(text, wanted)) ||
    patterns.some((pattern) => pattern.test(wanted))
  )
}

/** Les intitulés que le manuel déclare comme tels. */
function manualLabels(language: UiLanguage): string[] {
  return [
    ...new Set(
      [...manual(language).matchAll(/<span class="manual__ui">([^<]*)<\/span>/g)].map((match) =>
        normalize(match[1] ?? '')
      )
    )
  ]
}

/** Le guillemet de chaque langue — celui que le catalogue emploie lui aussi. */
const QUOTES: Readonly<Record<UiLanguage, RegExp>> = {
  fr: /«([^»]*)»/g,
  es: /«([^»]*)»/g,
  de: /„([^“]*)“/g,
  en: /“([^”]*)”/g,
  nl: /‘([^’]*)’/g
}

/**
 * Les citations du README qui **se donnent pour des intitulés** : entre les guillemets de
 * la langue, et commençant par une majuscule.
 *
 * La majuscule est le seul signal disponible en Markdown, et il est bon : la prose citée
 * commence par une minuscule (« donner moins », « ce gadget n'écrit pas »), un intitulé
 * porte la majuscule de son bouton. Ce qui commence par un chiffre est une **valeur**
 * — « 2500 », « 1.0.3-beta » — et ne se cherche pas dans un catalogue.
 *
 * Reste un cas que la majuscule ne départage pas : la **parole citée**. Le README cite le
 * message d'un pilote sur un forum, et une traduction peut le commencer par une majuscule
 * là où le français ne le faisait pas. D'où la longueur maximale : un intitulé tient sur
 * un bouton — le plus long des cinq manuels fait 66 caractères — un témoignage, non.
 */
const MAX_LABEL_LENGTH = 90

function readmeLabels(language: UiLanguage): string[] {
  const quoted = [...readme(language).matchAll(QUOTES[language])].map((match) =>
    normalize(match[1] ?? '')
  )
  return [
    ...new Set(
      quoted.filter((text) => /^\p{Lu}/u.test(text) && text.length <= MAX_LABEL_LENGTH)
    )
  ]
}

/**
 * Le relevé des cinq langues d'un coup, plutôt qu'un `expect` par langue.
 *
 * Une boucle d'assertions s'arrête à la première : on corrige le français, on relance, on
 * découvre l'allemand, et ainsi cinq fois. Un seul objet montre les cinq écarts ensemble
 * — et une correction française qui n'est pas passée dans les quatre traductions saute
 * aux yeux, ce qui est exactement la dérive qu'on cherche.
 */
function unknownByLanguage(
  labels: (language: UiLanguage) => string[],
  alsoIn: (language: UiLanguage) => string[] = () => []
): Record<string, string[]> {
  const found: Record<string, string[]> = {}
  for (const language of UI_LANGUAGES) {
    const pool = alsoIn(language)
    const unknown = labels(language).filter((label) => !exists(label, language, pool))
    if (unknown.length > 0) found[language] = unknown
  }
  return found
}

describe('les intitulés cités par la documentation', () => {
  it('existent tous, dans les cinq manuels', () => {
    expect(unknownByLanguage(manualLabels), 'intitulés introuvables, par langue').toEqual({})
  })

  it('existent tous, dans les cinq README', () => {
    expect(
      unknownByLanguage(readmeLabels, manualHeadings),
      'intitulés introuvables, par langue'
    ).toEqual({})
  })

  it('sont assez nombreux pour que le contrôle veuille dire quelque chose', () => {
    // Un balisage qu'on cesserait d'employer viderait le test sans le faire échouer :
    // il passerait au vert en ne vérifiant plus rien. Ce seuil dit à quel point la
    // documentation s'appuie aujourd'hui sur la convention, et refuse qu'elle s'efface.
    for (const language of UI_LANGUAGES) {
      expect(manualLabels(language).length, `manuel.${language}.html`).toBeGreaterThan(80)
    }
  })
})
