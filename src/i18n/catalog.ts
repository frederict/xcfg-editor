import type { UiLanguage } from './languages'
import type { PluralForms } from './plural'
// `import type` : effacé à la compilation. Le catalogue français sert de **type** aux
// quatre autres sans qu'aucun d'eux n'embarque un octet de français à l'exécution.
import type { FrenchMessages } from './messages/fr'

/**
 * # Le catalogue de messages : la forme, et pourquoi elle
 *
 * ## Rendre l'oubli d'une traduction impossible, pas improbable
 *
 * Le jeu de clés est **dérivé du français** : `MessageKey = keyof FrenchMessages`. Un
 * catalogue déclaré `MessageCatalog` doit donc porter exactement ces clés — une manquante
 * est une erreur de compilation, une clé en trop aussi (contrôle des propriétés
 * excédentaires sur un littéral d'objet). Le typage porte même la **forme** : une clé
 * dont le français donne un pluriel exige un pluriel dans les quatre autres langues, et
 * une clé figée exige une chaîne.
 *
 * `npx tsc --noEmit` suffit donc à répondre « aucune traduction ne manque ». Trois choses
 * lui échappent, et c'est le travail des tests (`tests/i18n/catalog.test.ts`) :
 *
 * 1. une traduction qui **oublie un repère nommé** — `{total}` disparu de la phrase
 *    allemande : le type ne voit qu'une `string` ;
 * 2. une traduction **recopiée du français** par inadvertance ;
 * 3. un catalogue dont le **fichier ne se charge pas**.
 *
 * ## Les repères sont nommés, jamais positionnels
 *
 * `{count}`, `{total}`, `{name}` — et non `%s` ni une concaténation. L'ordre des mots
 * change d'une langue à l'autre : l'allemand renvoie le verbe à la fin, l'espagnol met
 * souvent le verbe en tête. Un repère nommé se déplace dans la phrase ; un fragment
 * concaténé, non.
 *
 * ## Un dossier par langue, un morceau par langue
 *
 * Cette application se télécharge depuis GitHub Pages. Charger cinq catalogues pour en
 * afficher un serait quatre cinquièmes de gaspillage à chaque premier écran. Chaque
 * langue est donc un module à part, atteint par un `import()` — Vite en fait cinq
 * morceaux séparés et n'en télécharge qu'un.
 *
 * Depuis le découpage par domaine (`src/i18n/domains.ts`), une langue est un **dossier**
 * de neuf fichiers plus un `index.ts` qui les réunit. Ces neuf fichiers ne sont importés
 * que par cet `index.ts`, donc par personne d'autre : Vite les fond dans le morceau de la
 * langue, et le nombre de morceaux ne change pas.
 *
 * **On ne charge PAS un domaine à la demande, et c'est délibéré.** Neuf morceaux par
 * langue au lieu d'un, ce sont neuf requêtes, neuf en-têtes et neuf occasions qu'un écran
 * s'affiche avant sa prose ; à l'échelle de ce catalogue — quelques dizaines de
 * kilo-octets pour la langue entière — le gain de trafic ne paierait ni la complexité ni
 * le clignotement. Le découpage sert le **travail en parallèle**, pas le réseau.
 *
 * Le chemin n'est **pas** calculé (`./messages/${code}`) comme dans
 * `src/catalog/widgetCatalog.ts`, mais énuméré dans `LOADERS`. Deux raisons : cinq
 * langues tiennent en cinq lignes, et surtout un `import()` statique par langue est
 * vérifié par le compilateur — une langue ajoutée à `UiLanguage` sans son fichier ne
 * compile pas. Avec un chemin calculé, elle ne casserait qu'à l'exécution, chez le
 * pilote qui a précisément choisi cette langue-là.
 *
 * **Mesuré** (`npm run build`, Vite 8.2.2, l'application entière — une commande, et non
 * plus une entrée fabriquée pour la mesure) : **cinq** morceaux distincts, un par langue
 * — les neuf fichiers de domaine d'une langue sont bien fondus dans le sien, et le
 * découpage n'a donc rien changé au nombre de requêtes.
 *
 * Les lots d'extraction ont versé la prose des écrans : chaque catalogue porte les
 * **1 145 messages** relevés à cette mesure, soit
 * 1 272 formes, les 127 pluriels comptant double. Il pèse de 31,6 ko compressés (fr,
 * 116 ko bruts) à 35,3 ko (de, 129 ko) — l'anglais, l'espagnol et le néerlandais entre
 * les deux —, et le pilote en télécharge **un**.
 *
 * Les quatre autres pèsent 135 ko compressés à eux quatre, et c'est exactement ce
 * qu'une extraction en un seul fichier ferait télécharger pour rien. L'estimation d'avant
 * l'extraction — « de l'ordre de 25 ko par langue » — est remplacée par cette mesure.
 */

/**
 * Toutes les clés de message, dérivées du catalogue français — les neuf domaines réunis.
 * Le jeu de clés reste **plat** : `t('library.entryCount')` ne dit pas de quel fichier il
 * vient. Voir `src/i18n/domains.ts`.
 */
export type MessageKey = keyof FrenchMessages

/**
 * Un catalogue complet. La forme de chaque entrée suit celle du français : figée là où le
 * français est figé, pluriel là où le français est pluriel.
 */
export type MessageCatalog = {
  [K in MessageKey]: FrenchMessages[K] extends string ? string : PluralForms
}

/**
 * Les noms de repère d'un message, extraits du texte **par le type**. C'est ce qui permet
 * à `t()` d'exiger exactement les valeurs que la phrase attend : ni oubli, ni valeur
 * inutile.
 *
 * La récursion se fait par repère et non par caractère — deux ou trois niveaux pour les
 * phrases les plus fournies, très loin de la limite du compilateur.
 */
export type Placeholders<S extends string> =
  S extends `${string}{${infer Name}}${infer Rest}` ? Name | Placeholders<Rest> : never

/** Les textes portés par une entrée : la chaîne elle-même, ou toutes les formes du pluriel. */
type EntryText<E> = E extends string ? E : E extends Record<string, infer V> ? V & string : never

/**
 * Ce que `t()` réclame pour une clé donnée. Une entrée au pluriel exige toujours
 * `count`, et il doit être un `number` : c'est lui qui choisit la forme.
 */
export type MessageValues<K extends MessageKey> =
  FrenchMessages[K] extends string
    ? Record<Placeholders<EntryText<FrenchMessages[K]>>, string | number>
    : Record<Placeholders<EntryText<FrenchMessages[K]>>, string | number> & { count: number }

/**
 * L'argument de `t()`, absent quand la phrase n'attend rien. `t('action.redo')` s'écrit
 * sans second argument, et `t('action.redoNamed')` ne compile pas sans le sien.
 */
export type MessageArgs<K extends MessageKey> =
  [keyof MessageValues<K>] extends [never] ? [] : [values: MessageValues<K>]

/**
 * Un `import()` statique par langue — voir l'en-tête. `Record<UiLanguage, …>` oblige à en
 * ajouter un quand une sixième langue apparaît.
 */
const LOADERS: Readonly<Record<UiLanguage, () => Promise<{ default: MessageCatalog }>>> = {
  fr: () => import('./messages/fr'),
  de: () => import('./messages/de'),
  en: () => import('./messages/en'),
  es: () => import('./messages/es'),
  nl: () => import('./messages/nl')
}

/**
 * Chargements en cours ou terminés. On mémorise la **promesse** et non le catalogue :
 * deux appels concurrents avant la fin du téléchargement doivent partager la même
 * requête, pas en lancer deux.
 */
const loading = new Map<UiLanguage, Promise<MessageCatalog>>()

/**
 * Charge le catalogue d'une langue. La promesse rendue livre un objet dont toute lecture
 * est ensuite synchrone.
 *
 * Un morceau qui n'arrive pas — réseau coupé, cache purgé — ne condamne pas la langue
 * pour toute la session : l'échec est oublié pour qu'un appel ultérieur retente. Même
 * choix que `loadWidgetCatalog`, pour la même raison.
 */
export function loadMessages(language: UiLanguage): Promise<MessageCatalog> {
  const pending = loading.get(language)
  if (pending !== undefined) return pending
  const started = LOADERS[language]()
    .then((module) => module.default)
    .catch((error: unknown) => {
      loading.delete(language)
      throw error
    })
  loading.set(language, started)
  return started
}
