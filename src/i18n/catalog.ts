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
 * ## Un fichier par langue, chargé à la demande
 *
 * Cette application se télécharge depuis GitHub Pages. Charger cinq catalogues pour en
 * afficher un serait quatre cinquièmes de gaspillage à chaque premier écran. Chaque
 * langue est donc un module à part, atteint par un `import()` — Vite en fait cinq
 * morceaux séparés et n'en télécharge qu'un.
 *
 * Le chemin n'est **pas** calculé (`./messages/${code}`) comme dans
 * `src/catalog/widgetCatalog.ts`, mais énuméré dans `LOADERS`. Deux raisons : cinq
 * langues tiennent en cinq lignes, et surtout un `import()` statique par langue est
 * vérifié par le compilateur — une langue ajoutée à `UiLanguage` sans son fichier ne
 * compile pas. Avec un chemin calculé, elle ne casserait qu'à l'exécution, chez le
 * pilote qui a précisément choisi cette langue-là.
 *
 * **Mesuré** (Vite 8, `minify: true`, sur une entrée qui n'importe que `src/i18n/`) : cinq
 * morceaux distincts, un par langue. Le socle pèse 1 765 octets compressés ; chaque
 * catalogue de ce socle — 21 messages — en pèse 742 à 826, et le pilote en télécharge
 * **un**. À l'échelle des 627 unités de message du dépôt, l'ordre de grandeur est de 25 ko
 * compressés par langue : c'est ce qu'une extraction en un seul fichier ferait
 * télécharger cinq fois, pour en afficher une.
 */

/** Toutes les clés de message, dérivées du catalogue français. */
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
