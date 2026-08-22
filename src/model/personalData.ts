import PERSONAL_KEYS from './personalKeys.json'
import type { PersonalData as CatalogPersonalData, PreferenceScope } from '../catalog/preferenceCatalog'
import { decode, getMember } from '../core/access'
import type { JsonNode } from '../core/jsonDocument'
import { readLayout, type Layout } from './layout'
import { findFreeTextSlots, type FreeText } from './scope'
import type { Orientation } from './mutations'
// `import type` : effacé à la compilation. Ce module **ne dépend pas** de `src/i18n/` à
// l'exécution — il reçoit un traducteur en argument. Voir « La prose de ce module ».
import type { MessageKey, Translator } from '../i18n'

/**
 * **La seule réponse de cet outil à la question « qu'y a-t-il de personnel dans ce
 * fichier ? »**
 *
 * ## Pourquoi ce module existe
 *
 * Quatre écrans posaient la question et rendaient quatre chiffres : la page des réglages
 * croisait le catalogue des préférences avec le fichier, la bibliothèque connaissait
 * quatre familles de clés écrites à la main, la boîte de partage comptait les textes
 * libres du `layout`, et l'avertissement d'import suivait une heuristique à lui. Chacun
 * était juste dans son périmètre — et aucun ne disait qu'il ne comptait pas la même chose
 * que le voisin. Un pilote qui traversait les quatre lisait quatre réponses à ce qu'il
 * croyait être une seule question, juste avant de donner son fichier à quelqu'un.
 *
 * L'inventaire vit donc **ici**, dans le modèle, et les quatre écrans en sont des vues.
 * Il était auparavant coincé dans des fonctions privées de `src/ui/warnings.ts`, un
 * module qui importe tout le moteur de rendu : la bibliothèque le recopiait faute de
 * pouvoir l'importer, et le disait (`identity.ts`, « la primitive qui manque est un
 * inventaire des données personnelles dans `src/model/` »). La voici.
 *
 * ## Quatre distinctions, parce que ce sont de vraies différences
 *
 * 1. **Où ça vit** — `home`. Dans le `layout`, la donnée **part avec un export
 *    « pages »** ; dans les `preferences`, elle reste sur l'appareil dès lors qu'on
 *    n'exporte que les pages. C'est la distinction qui décide de ce qui voyage, et la
 *    seule qui réponde à « puis-je envoyer ce fichier ? ». ⚠️ Un export `pages` **peut**
 *    porter des données personnelles : `contact/fullName` et `contact/phoneNumber` d'un
 *    `WButtonPhone` sont dans le `layout`. « Le format `pages` est sûr par construction »
 *    est faux.
 * 2. **Ce que c'est** — `kind`. Les neuf natures du catalogue des préférences
 *    (`credential`, `location`, `device`, `identity`, `file`, `equipment`, `freeText`,
 *    `sharing`, `contact`), reprises telles quelles pour le `layout` : un vocabulaire, pas
 *    deux.
 * 3. **D'où on le sait** — `basis`. `scope` et `inputType` sont **lus dans l'APK** : la
 *    portée `SECURE` que XCTrack déclare, le champ de saisie qu'il masque. `declared` est
 *    un **jugement de notre part**, et il porte toujours sa raison. Cette distinction est
 *    la valeur du projet ; l'unification ne doit pas la gommer, et `counts.read` /
 *    `counts.judged` la gardent visible partout.
 * 4. **Ce qui est renseigné** — `filled`. Une fiche `contact` présente mais vide n'est pas
 *    un numéro de téléphone ; un `ActiveLook.Name` vide n'est pas le nom de vos lunettes.
 *    Mesuré : les 15 `WButtonPhone` du corpus portent tous une structure vide, et le
 *    backup de référence porte 5 clés personnelles vides sur 16.
 *
 * ## Ce que ce module ne fait pas
 *
 * - **Il ne retire rien.** Même éthique que `warnings.ts` : on signale, on ne corrige
 *   jamais. Le remplacement des textes est un geste demandé, et il vit dans `sharing.ts`.
 * - **Il n'invente pas un chiffre commun.** Les écrans comptent légitimement des choses
 *   différentes ; ce module leur donne de quoi **nommer** ce qu'ils comptent —
 *   `counts.preferences`, `counts.layout`, `counts.filled` — au lieu d'aligner un total
 *   qui ne voudrait rien dire.
 * - **Il ne montre jamais le contenu d'une structure.** `Navigation.State` porte la tâche
 *   en cours avec ses coordonnées — 1 332 caractères dans le backup de référence, et elle
 *   est `PUBLIC`, donc elle voyage. On en dit la taille et le danger, jamais le contenu.
 *
 * ## La prose de ce module : elle reçoit un traducteur, elle ne le lit pas
 *
 * `personalProse(tr)` rend les mots de cet inventaire dans la langue du pilote. Le
 * traducteur est **passé**, jamais importé : de `src/i18n/` ce fichier ne prend que le
 * type `Translator`, effacé à la compilation. Le modèle reste donc ce qu'il est — une
 * couche que la bibliothèque et les écrans peuvent charger sans traîner cinq catalogues.
 *
 * C'est le motif déjà employé par `resolveLanguage` (`src/model/preferences.ts`), qui
 * reçoit `navigator.language` au lieu de le lire, et par `src/i18n/preference.ts`, qui
 * reçoit `localStorage`. Voir `src/i18n/CLAUDE.md` pour la décision et son alternative
 * écartée — rendre des clés que l'appelant traduirait.
 *
 * ⚠️ **Transition.** Les constantes françaises `PERSONAL_KIND_LABELS`,
 * `PERSONAL_BASIS_LABELS`, `PERSONAL_CAVEAT`, `personalHomeLabel` et `personalValueText`
 * sont **héritées** : quatre écrans les emploient encore. Elles disparaîtront quand ces
 * écrans seront passés à `personalProse`. En attendant, `personalData.test.ts` vérifie
 * que le catalogue français dit **exactement** ce qu'elles disent : aucune dérive n'est
 * possible pendant la transition, et le jour de la bascule il n'y a rien à relire.
 *
 * ## Le poids
 *
 * `personalKeys.json` — 7,3 Ko, les 44 clés marquées du catalogue avec leur nature, leur
 * base et leur raison — est importé **statiquement**, parce que trois des quatre appelants
 * (l'avertissement d'import, la bibliothèque, la boîte de partage) n'ont pas le catalogue
 * sous la main et ne doivent pas le charger : `preferenceCatalog/base.json` pèse 96 Ko et
 * reste chargé à la demande. Le fichier est **extrait du catalogue** par
 * `tools/extract-preferences.py`, pas recopié à la main, et `personalData.test.ts` vérifie
 * à chaque exécution qu'il en est la copie exacte : une liste écrite à la main dériverait
 * du catalogue au premier APK, en silence.
 */

/* ------------------------------------------------------------------ le vocabulaire */

/** La nature d'une donnée — les neuf du catalogue, employées aussi pour le `layout`. */
export type PersonalKind = CatalogPersonalData['kind']

/**
 * Sur quoi l'affirmation repose. `scope` et `inputType` sont **lus dans l'APK** ;
 * `declared` est un jugement, et il porte sa raison.
 */
export type PersonalBasis = CatalogPersonalData['basis']

/** Où la donnée vit — donc ce qui décide si elle voyage avec un export « pages ». */
export type PersonalHome = 'layout' | 'preferences'

/**
 * Le mot affiché pour chaque nature, **en français seulement**.
 *
 * ⚠️ Hérité : employer `personalProse(tr).kind(kind)`. Voir « La prose de ce module ».
 */
export const PERSONAL_KIND_LABELS: Record<PersonalKind, string> = {
  identity: 'identité',
  credential: 'identifiant',
  contact: 'contact',
  device: 'appareil',
  location: 'position',
  file: 'fichier',
  freeText: 'texte libre',
  equipment: 'matériel',
  sharing: 'partage'
}

/**
 * Ce que chaque base dit au pilote. Lu dans l'application, ou jugé par nous.
 *
 * ## Trois calques de l'anglais, remplacés par ce qu'ils voulaient dire
 *
 * - *scope* était devenu « **portée** lue dans l'application » : un pilote y lit la
 *   portée d'un émetteur, ou une portée de musique. C'est un attribut que XCTrack déclare
 *   lui-même sur ce réglage, et c'est ça qu'il faut dire ;
 * - « champ de saisie **masqué** dans l'application » se lit « champ caché ». Il n'est
 *   pas caché : il se saisit en points, comme un mot de passe ;
 * - « jugement de **l'extraction** » ne dit ni qui juge, ni quoi. C'est **nous**.
 *
 * Ce que ces trois mots portent, et qu'il ne faut pas perdre : la **provenance de
 * l'affirmation** — lue dans XCTrack, ou jugée par cet éditeur. C'est la distinction
 * mesuré / supposé, appliquée aux données personnelles.
 *
 * ⚠️ Hérité, en français seulement : employer `personalProse(tr).basis(basis)`.
 */
export const PERSONAL_BASIS_LABELS: Record<PersonalBasis, string> = {
  scope: 'XCTrack le déclare lui-même',
  inputType: 'XCTrack le saisit en points, comme un mot de passe',
  declared: 'c’est notre jugement, pas celui de XCTrack'
}

/** Vrai si l'affirmation est **lue** dans l'APK, faux si elle est jugée par nous. */
export function isReadFromApk(basis: PersonalBasis): boolean {
  return basis !== 'declared'
}

/**
 * L'emplacement dit dans les mots du pilote, avec sa conséquence — c'est la conséquence
 * qui compte, pas le nom de la section.
 *
 * ⚠️ Hérité, en français seulement : employer `personalProse(tr).home(home)`.
 */
export function personalHomeLabel(home: PersonalHome): string {
  return home === 'layout'
    ? 'Disposition — part avec les pages'
    : 'Préférences — reste chez vous dans un export « pages »'
}

/* ------------------------------------------------------------------ ce qu'on trouve */

/** Où, dans les pages, se trouve un texte personnel. Absent pour une préférence. */
export interface PersonalLocation {
  orientation: Orientation
  /** Rang de la page dans son orientation, à partir de 1 — le rang que voit le pilote. */
  pageRank: number
  /** Rang du gadget dans le tableau `widgets`, à partir de 1 : l'ordre de dessin. */
  widgetRank: number
  className: string
  shortName: string
  /** Chemin de la clé sous le gadget : `titletext`, `contact/phoneNumber`. */
  keyPath: string
}

/** Une donnée personnelle repérée dans un fichier, et tout ce qu'on en sait. */
export interface PersonalFinding {
  home: PersonalHome
  /**
   * `Pilot.Name` pour une préférence ; `WButtonPhone/contact/phoneNumber` pour le
   * `layout` — le type de gadget puis le chemin de la clé, comme la bibliothèque
   * l'affiche déjà.
   */
  key: string
  kind: PersonalKind
  basis: PersonalBasis
  /** Pourquoi cette clé est dite personnelle. Destiné à être montré au pilote. */
  reason: string
  /**
   * Vrai si la clé porte effectivement quelque chose. Faux pour une chaîne vide, une
   * liste vide, une structure sans entrée : l'emplacement existe, il n'est pas rempli.
   */
  filled: boolean
  /** La valeur, quand c'est un scalaire. Jamais le contenu d'une structure. */
  value?: string
  /** Les éléments d'une liste, quand elle en porte — voir `LIST_DETAILS`. */
  values?: string[]
  /** Combien d'entrées porte une structure dont on ne montre pas le contenu. */
  entryCount?: number
  /**
   * La portée que XCTrack déclare pour cette préférence. `PUBLIC` voyage avec un
   * `backup`, `INTERNAL` ne quitte jamais l'appareil, `SECURE` est chiffrée. Absente pour
   * le `layout`, qui n'a pas de portée : il voyage toujours.
   */
  scope?: PreferenceScope | null
  location?: PersonalLocation
}

/**
 * Les chiffres, **nommés**. Aucun n'est « le » chiffre : chacun répond à une question
 * différente, et un écran qui en affiche un doit dire lequel.
 */
export interface PersonalCounts {
  /** Tout ce qui a été repéré, renseigné ou non. */
  total: number
  /** Ce qui vit dans le `layout` : **ce qui part avec un export « pages »**. */
  layout: number
  /** Ce qui vit dans les `preferences` : ce qu'un export « pages » laisse sur place. */
  preferences: number
  /** Ce qui porte effectivement quelque chose. */
  filled: number
  /** Les emplacements présents mais vides. Un bouton d'appel sans numéro en est un. */
  empty: number
  /** Ce qui est **lu dans l'APK** — portée `SECURE`, champ de saisie masqué. */
  read: number
  /** Ce qui est **jugé par nous**, avec sa raison. */
  judged: number
}

/** D'où vient la liste des clés de préférences surveillées. Un relevé se date. */
export interface PersonalKnowledge {
  versionName: string | null
  versionCode: number | null
  /** Combien de clés de préférences le relevé surveille — 44 dans la 1.0.3-beta5. */
  keyCount: number
}

export interface PersonalInventory {
  /** Dans l'ordre du fichier : le `layout` d'abord, puis les `preferences`. */
  findings: PersonalFinding[]
  counts: PersonalCounts
  knowledge: PersonalKnowledge
}

/* ------------------------------------------------- les clés du layout, et leur nature */

/**
 * Les clés de raison du `layout`, et elles seules. `MessageKey` tout entier serait trop
 * large : `t()` exigerait alors les repères de la plus exigeante des 21 phrases du
 * catalogue. Restreindre au préfixe rend le type juste — ces douze-là n'attendent rien.
 */
type LayoutReasonKey = Extract<MessageKey, `personalReason.${string}`>

interface LayoutKeyRule {
  kind: PersonalKind
  /**
   * ⚠️ Hérité, en français : la raison telle que `PersonalFinding.reason` la porte encore
   * pour les quatre écrans qui n'ont pas de traducteur. `personalProse(tr).reason()`
   * emploie `reasonKey`, et un test vérifie que les deux disent la même chose en français.
   */
  reason: string
  /** La même raison, traduisible. C'est celle-ci qui reste quand la précédente partira. */
  reasonKey: LayoutReasonKey
}

/**
 * Ce que porte chacune des onze clés de texte libre du `layout`, et pourquoi c'est
 * personnel.
 *
 * La **liste** des clés vient de `FREE_TEXT_KEYS` (`scope.ts`), relevée sur le catalogue
 * extrait de l'APK — 75 gadgets écrits sur l'appareil puis réexportés. Ce qui est écrit
 * ici est la **nature** qu'on leur attribue et la raison qui va avec : un jugement, donc
 * `basis: 'declared'` pour toutes. Aucune n'a de portée déclarée par XCTrack — le
 * `layout` n'en a pas, il voyage toujours.
 *
 * Une clé de `FREE_TEXT_KEYS` sans règle propre reçoit `UNKNOWN_LAYOUT_KEY` ; un test
 * vérifie que le cas ne se produit pas, exactement comme `FREE_TEXT_RULES` dans
 * `sharing.ts`.
 */
const LAYOUT_KEY_RULES: Record<string, LayoutKeyRule> = {
  titletext: {
    kind: 'freeText',
    reason: 'titre personnalisé d’un gadget, écrit par vous',
    reasonKey: 'personalReason.titletext'
  },
  text: {
    kind: 'freeText',
    reason: 'contenu entier d’un gadget de texte libre, écrit par vous',
    reasonKey: 'personalReason.text'
  },
  fullName: {
    kind: 'contact',
    reason: 'nom d’une personne enregistrée sur un bouton d’appel',
    reasonKey: 'personalReason.fullName'
  },
  phoneNumber: {
    kind: 'contact',
    reason: 'numéro de téléphone enregistré sur un bouton d’appel',
    reasonKey: 'personalReason.phoneNumber'
  },
  url: {
    kind: 'freeText',
    reason: 'adresse web saisie, qui peut porter un jeton ou un identifiant',
    reasonKey: 'personalReason.url'
  },
  title: {
    kind: 'freeText',
    reason: 'libellé d’un bouton de lancement, écrit par vous',
    reasonKey: 'personalReason.title'
  },
  name: {
    kind: 'freeText',
    reason: 'nom de l’application visée par un bouton de lancement',
    reasonKey: 'personalReason.name'
  },
  action: {
    kind: 'freeText',
    reason: 'action Android d’un bouton de lancement, qui peut être un URI complet',
    reasonKey: 'personalReason.action'
  },
  filter: {
    kind: 'freeText',
    reason: 'filtre de journal que vous avez saisi',
    reasonKey: 'personalReason.filter'
  },
  suffix: {
    kind: 'freeText',
    reason: 'texte placé après la valeur affichée, écrit par vous',
    reasonKey: 'personalReason.suffix'
  },
  event: {
    kind: 'freeText',
    reason: 'nom d’événement que vous avez saisi',
    reasonKey: 'personalReason.event'
  }
}

/** Le repli d'une clé de texte libre qu'une version future ajouterait sans nous. */
const UNKNOWN_LAYOUT_KEY: LayoutKeyRule = {
  kind: 'freeText',
  reason: 'texte libre sans règle propre : traité comme personnel, par précaution',
  reasonKey: 'personalReason.unknown'
}

/**
 * **Quels emplacements vides méritent d'être dits.**
 *
 * Le corpus compte 1 401 `titletext` vides : les montrer tous cacherait les vrais. Mais
 * une fiche `contact` de `WButtonPhone` présente et vide se dit — c'est un bouton d'appel
 * qui existe, sans destinataire dedans, et les 15 `WButtonPhone` du corpus sont dans ce
 * cas. Le pilote qui reçoit un tel fichier doit savoir que l'emplacement est là ; celui
 * qui partage le sien doit savoir qu'il n'y a rien dedans. Les deux se trompent si on
 * confond « pas de numéro » et « un numéro ».
 */
function reportsEmptySlot(rule: LayoutKeyRule): boolean {
  return rule.kind === 'contact'
}

/* ----------------------------------------- les clés de préférences, lues du catalogue */

interface RawPersonalKey {
  kind: string
  basis: string
  reason: string
  scope: string | null
}

const KNOWN_PREFERENCE_KEYS = PERSONAL_KEYS.keys as unknown as Record<string, RawPersonalKey>

/**
 * Les clés dont on montre les éléments plutôt que la seule taille, et pourquoi.
 *
 * **Une seule, et c'est délibéré.** `Navigation.WaypointFiles` est une structure, mais ce
 * qu'elle porte de personnel n'est pas sa taille : ce sont les **noms de fichiers**, qui
 * désignent souvent la compétition à laquelle le pilote participe. Les taire reviendrait
 * à dire « une structure de 4 clés » là où le fichier dit « coupe-exemple-2026 ».
 *
 * Le contre-exemple est juste à côté et il commande la règle : `Navigation.State` porte
 * la tâche en cours avec ses coordonnées, et on n'en montre **jamais** le contenu. Une
 * extraction générique des chaînes d'une structure la déballerait ; c'est pourquoi la
 * liste est nominative, courte, et justifiée clé par clé.
 */
const LIST_DETAILS: Record<string, string> = {
  'Navigation.WaypointFiles': 'files'
}

/* --------------------------------------------------------------------- la lecture */

/** Vrai si ce nœud porte effectivement quelque chose — voir `PersonalFinding.filled`. */
function isFilled(node: JsonNode): boolean {
  if (node.kind === 'string') return decode(node.raw).trim() !== ''
  if (node.kind === 'array') return node.items.length > 0
  if (node.kind === 'object') return node.entries.length > 0
  // Un nombre, un booléen, `null` : un littéral écrit est une valeur. `Livetrack.Enabled`
  // à `false` est un choix de diffusion, pas un emplacement vide.
  return true
}

/** Les chaînes d'un tableau JSON, les autres types étant ignorés. */
function stringsOf(node: JsonNode | undefined): string[] {
  if (node?.kind !== 'array') return []
  return node.items.filter((item) => item.kind === 'string').map((item) => decode(item.raw))
}

/** La valeur d'un scalaire, telle qu'elle est écrite dans le fichier. */
function scalarText(node: JsonNode): string | undefined {
  if (node.kind === 'string') return decode(node.raw)
  if (node.kind === 'literal') return node.raw
  return undefined
}

function readPreferenceFinding(key: string, node: JsonNode): PersonalFinding {
  const known = KNOWN_PREFERENCE_KEYS[key]!
  const finding: PersonalFinding = {
    home: 'preferences',
    key,
    kind: known.kind as PersonalKind,
    basis: known.basis as PersonalBasis,
    reason: known.reason,
    filled: isFilled(node),
    scope: known.scope as PreferenceScope | null
  }

  const scalar = scalarText(node)
  if (scalar !== undefined) {
    finding.value = scalar
    return finding
  }

  if (node.kind === 'array') {
    finding.entryCount = node.items.length
    const strings = stringsOf(node)
    if (strings.length === node.items.length && strings.length > 0) finding.values = strings
    return finding
  }

  if (node.kind !== 'object') return finding
  finding.entryCount = node.entries.length
  const listKey = LIST_DETAILS[key]
  if (listKey !== undefined) {
    const list = stringsOf(getMember(node, listKey))
    if (list.length > 0) finding.values = list
  }
  return finding
}

/** La règle d'une clé du `layout`, désignée par son chemin — `contact/phoneNumber`. */
function layoutRule(keyPath: string): LayoutKeyRule {
  const cut = keyPath.lastIndexOf('/')
  return LAYOUT_KEY_RULES[cut === -1 ? keyPath : keyPath.slice(cut + 1)] ?? UNKNOWN_LAYOUT_KEY
}

function layoutFinding(slot: FreeText, rule: LayoutKeyRule): PersonalFinding {
  const finding: PersonalFinding = {
    home: 'layout',
    key: `${slot.shortName}/${slot.keyPath}`,
    kind: rule.kind,
    // Le `layout` n'a pas de portée déclarée : ce qui suit est notre jugement, et il
    // porte sa raison. Rien de ce fichier n'est lu dans l'APK au sens de `basis`.
    basis: 'declared',
    reason: rule.reason,
    filled: slot.text.trim() !== '',
    location: {
      orientation: slot.orientation,
      pageRank: slot.pageRank,
      widgetRank: slot.widgetRank,
      className: slot.className,
      shortName: slot.shortName,
      keyPath: slot.keyPath
    }
  }
  if (slot.text !== '') finding.value = slot.text
  return finding
}

function countOf(findings: PersonalFinding[]): PersonalCounts {
  const counts: PersonalCounts = {
    total: findings.length,
    layout: 0,
    preferences: 0,
    filled: 0,
    empty: 0,
    read: 0,
    judged: 0
  }
  for (const finding of findings) {
    if (finding.home === 'layout') counts.layout += 1
    else counts.preferences += 1
    if (finding.filled) counts.filled += 1
    else counts.empty += 1
    if (isReadFromApk(finding.basis)) counts.read += 1
    else counts.judged += 1
  }
  return counts
}

/**
 * Les clés personnelles que **XCTrack lui-même** déclare hors d'atteinte d'un export :
 * portée `SECURE` (préférences chiffrées : jetons, mots de passe, identifiants de compte)
 * ou `INTERNAL` (locale à l'appareil, `App.Guess*` en tête).
 *
 * Leur absence de tout fichier est **le renseignement**, et rien à l'écran ne peut la
 * faire deviner : `App.GuessLatitude` et `App.GuessLongitude` sont la position présumée de
 * l'appareil — en pratique le domicile — et aucun export ne les porte. Un pilote qui
 * l'ignore craint la mauvaise chose et rate la bonne (`Navigation.State`, `PUBLIC`, qui
 * voyage avec sa tâche et ses coordonnées).
 *
 * Corollaire mesuré, et il vaut d'être dit : **tout ce qu'un fichier réel porte de
 * personnel relève du jugement** (`basis: 'declared'`). Les seules clés dont la base est
 * *lue* dans l'APK sont précisément celles-ci, et elles ne sortent jamais.
 */
export const NEVER_EXPORTED_PERSONAL_KEYS: readonly string[] =
  Object.keys(KNOWN_PREFERENCE_KEYS)
    .filter((key) => ['SECURE', 'INTERNAL'].includes(KNOWN_PREFERENCE_KEYS[key]!.scope ?? ''))

/** Celles que XCTrack chiffre — le sous-ensemble le plus net de la liste précédente. */
export const SECURE_PERSONAL_KEYS: readonly string[] =
  Object.keys(KNOWN_PREFERENCE_KEYS).filter((key) => KNOWN_PREFERENCE_KEYS[key]!.scope === 'SECURE')

/** Ce que le relevé des clés de préférences sait, et de quelle version il le tient. */
export const PERSONAL_KNOWLEDGE: PersonalKnowledge = {
  versionName: PERSONAL_KEYS.meta.versionName,
  versionCode: PERSONAL_KEYS.meta.versionCode,
  keyCount: PERSONAL_KEYS.meta.keyCount
}

/**
 * Dresse l'inventaire des données personnelles d'un document analysé. **Ne modifie
 * rien** : le document ressort tel quel, et aucun nœud n'est conservé.
 *
 * Le `layout` vient en premier, dans l'ordre du fichier : un pilote qui ne lirait que la
 * première ligne doit tomber sur ce qu'il croyait ne pas envoyer. Les préférences
 * suivent, elles aussi dans l'ordre du fichier — celui de XCTrack, pas un ordre à nous.
 *
 * `layout` est un paramètre facultatif parce que trois appelants sur quatre l'ont déjà
 * lu : le relire coûterait une traversée complète pour rien.
 */
export function collectPersonalData(document: JsonNode, layout?: Layout): PersonalInventory {
  const findings: PersonalFinding[] = []

  for (const slot of findFreeTextSlots(layout ?? readLayout(document))) {
    const rule = layoutRule(slot.keyPath)
    const finding = layoutFinding(slot, rule)
    if (finding.filled || reportsEmptySlot(rule)) findings.push(finding)
  }

  const preferences = getMember(document, 'preferences')
  if (preferences?.kind === 'object') {
    for (const [rawKey, value] of preferences.entries) {
      const key = decode(rawKey)
      if (KNOWN_PREFERENCE_KEYS[key] === undefined) continue
      findings.push(readPreferenceFinding(key, value))
    }
  }

  return { findings, counts: countOf(findings), knowledge: PERSONAL_KNOWLEDGE }
}

/**
 * Ce que la donnée porte, en toutes lettres — **jamais le contenu d'une structure**.
 *
 * Les quatre écrans passent par ici, de sorte qu'aucun ne peut déballer par accident un
 * `Navigation.State` ou un `Sensors.Configuration` que le voisin résume. Un emplacement
 * vide se dit comme tel plutôt que par une chaîne vide, qui passerait pour un affichage
 * raté.
 */
export function personalValueText(finding: PersonalFinding): string {
  if (!finding.filled) return 'emplacement présent, mais vide'
  if (finding.values !== undefined) return finding.values.join(', ')
  if (finding.value !== undefined) return finding.value
  const count = finding.entryCount ?? 0
  return `structure de ${String(count)} entrée${count > 1 ? 's' : ''}, non montrée`
}

/** Ce que l'inventaire porte pour un emplacement donné, dans l'ordre du fichier. */
export function findingsIn(
  inventory: PersonalInventory, home: PersonalHome
): PersonalFinding[] {
  return inventory.findings.filter((finding) => finding.home === home)
}

/* ---------------------------------------------------------------- la prose, traduite */

/**
 * Les mots de cet inventaire, dans la langue du pilote.
 *
 * ```ts
 * const prose = personalProse(tr)
 * prose.kind(finding.kind)   // « identité », « Identität », « identidad »
 * prose.value(finding)       // « structure de 4 entrées, non montrée »
 * prose.caveat()
 * ```
 *
 * Un objet plutôt que six fonctions à qui passer `tr` : un écran qui affiche cinquante
 * lignes le construit une fois, et l'appel se lit sans répéter le traducteur cinquante
 * fois. C'est aussi ce qui permet aux six fonctions héritées de garder leur nom pendant
 * la transition.
 */
export interface PersonalProse {
  /** La nature de la donnée : « identité », « texte libre »… */
  kind(kind: PersonalKind): string
  /** Sur quoi l'affirmation repose — lu dans XCTrack, ou jugé par nous. */
  basis(basis: PersonalBasis): string
  /** Où la donnée vit, avec sa conséquence : c'est la conséquence qui compte. */
  home(home: PersonalHome): string
  /** Pourquoi cette donnée est dite personnelle. Voir la remarque sur les 44 raisons. */
  reason(finding: PersonalFinding): string
  /** Ce que la donnée porte — **jamais le contenu d'une structure**. */
  value(finding: PersonalFinding): string
  /** Ce qu'un relevé ne peut pas promettre. */
  caveat(): string
}

/**
 * ⚠️ **Les 44 raisons des clés de préférences ne sont pas traduites**, et `reason()` le
 * laisse voir : elles viennent de `personalKeys.json`, **extrait de l'APK** par
 * `tools/extract-preferences.py`. Ce sont des données, pas de la prose de code ; les
 * traduire demande de décider si le fichier extrait porte cinq colonnes ou des clés, et
 * cette décision appartient au lot qui reprendra l'extraction. Les onze raisons du
 * `layout`, elles, sont écrites ici et passent par le catalogue.
 */
export function personalProse(tr: Translator): PersonalProse {
  return {
    // Le repère du gabarit est une union fermée de neuf littéraux : une nature ajoutée
    // sans sa clé ne compile pas. C'est ce qu'un `Record` écrit à la main donnerait aussi,
    // en plus long.
    kind: (kind) => tr.t(`personalKind.${kind}`),

    basis: (basis) => tr.t(`personalBasis.${basis}`),

    home: (home) => tr.t(`personalHome.${home}`),

    reason: (finding) => {
      const keyPath = finding.location?.keyPath
      if (keyPath === undefined) return finding.reason
      return tr.t(layoutRule(keyPath).reasonKey)
    },

    value: (finding) => {
      if (!finding.filled) return tr.t('personal.emptySlot')
      // `join(', ')` et non `format.list` : ce sont des **données** alignées — des noms de
      // fichiers de balises —, pas une énumération dans une phrase. « coupe.wpt et
      // autre.wpt » ferait lire une prose là où il y a une colonne.
      if (finding.values !== undefined) return finding.values.join(', ')
      if (finding.value !== undefined) return finding.value
      return tr.t('personal.hiddenStructure', { count: finding.entryCount ?? 0 })
    },

    // `{version}` part en `string` et `{count}` en `number` : c'est la règle du socle, et
    // elle compte ici — « 1.0.3-beta-5-gc036d8f2c » ne se met pas en forme, « 44 » si.
    caveat: () => tr.t('personal.caveat', {
      version: PERSONAL_KNOWLEDGE.versionName ?? '?',
      count: PERSONAL_KNOWLEDGE.keyCount
    })
  }
}

/**
 * Ce qu'un relevé ne peut pas promettre, dit une fois pour toutes.
 *
 * Les quatre écrans le répétaient chacun à sa façon. La phrase est ici pour qu'ils la
 * disent avec les mêmes mots : le format de XCTrack change à chaque version, la liste des
 * clés surveillées se périme, et **un inventaire vide ne prouve pas une absence**.
 *
 * ⚠️ Hérité, en français seulement : employer `personalProse(tr).caveat()`.
 */
export const PERSONAL_CAVEAT =
  'Cet inventaire porte sur les réglages connus de XCTrack ' +
  `${PERSONAL_KNOWLEDGE.versionName ?? '?'} : ${PERSONAL_KNOWLEDGE.keyCount} réglages ` +
  'et onze champs de texte libre des gadgets. Le format change à chaque version — ' +
  'un inventaire vide ne prouve donc pas une absence.'
