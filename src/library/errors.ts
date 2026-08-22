/**
 * Les défaillances de la bibliothèque, nommées — parce qu'un échec de stockage muet est
 * exactement ce que ce jalon existe pour éviter.
 *
 * Un pilote range « Comp Annecy » dans la bibliothèque pour ne pas la perdre. Si
 * l'écriture échoue et que l'interface affiche quand même l'entrée, il croira sa
 * configuration en sûreté alors qu'elle n'existe nulle part. C'est le pire mode de
 * défaillance possible pour cette fonctionnalité : il ne se découvre qu'au moment où on
 * en avait besoin.
 *
 * D'où la règle : **toute opération d'écriture rejette avec une `LibraryError` typée**,
 * jamais avec un booléen, jamais en silence. `failure` dit quoi, `prose` dit quoi faire —
 * dans la langue du pilote —, `cause` garde l'erreur d'origine pour le rapport de bogue.
 *
 * ## Ce que le pilote lit n'est pas ce que la pile porte
 *
 * Une `Error` doit avoir un `message`, et il est lu par la console, le rapport de bogue et
 * le `cause` d'une erreur enveloppante : c'est une **ligne technique**, un identifiant,
 * qui ne se traduit pas. Ce que le pilote lit est ailleurs — `prose` porte une clé de
 * message et ses valeurs, et `libraryErrorText(error, tr)` en fait la phrase.
 *
 * Cette couche ne dépend pas de `src/i18n/` : elle n'en prend que des **types**, effacés à
 * la compilation, et le traducteur lui est passé au moment de l'affichage. Même motif que
 * `personalProse(tr)` — voir `src/i18n/CLAUDE.md` § 5.
 */

/**
 * Ce qui peut mal tourner. Sept cas, tous observés ou documentés — pas d'énumération
 * spéculative : chaque valeur est produite quelque part dans ce dossier.
 */
export type LibraryFailure =
  /** Aucun stockage durable : navigateur sans IndexedDB, ou mode privé qui le refuse. */
  | 'unavailable'
  /** Le navigateur refuse d'écrire davantage. Le quota du site est atteint. */
  | 'quota'
  /** Un autre onglet a modifié ou supprimé l'entrée entre la lecture et l'écriture. */
  | 'conflict'
  /** L'entrée demandée n'est pas (ou plus) dans la bibliothèque. */
  | 'not-found'
  /** Les octets relus ne rendent pas l'empreinte enregistrée avec eux. */
  | 'integrity'
  /** L'enregistrement de métadonnées ne se relit pas : champ absent ou d'un type faux. */
  | 'corrupt'
  /** L'archive proposée à l'import n'est pas une bibliothèque lisible. */
  | 'unreadable'

import { technicalDetail } from '../core/technicalDetail'
// `import type` : effacé à la compilation. Voir l'en-tête.
import type { MessageArgs, MessageKey, MessageValues, Translator } from '../i18n'

/** Les clés de message de cette couche, et elles seules. */
export type LibraryErrorKey = Extract<MessageKey, `libraryError.${string}`>

/** Les six noms d'opération — le sous-ensemble sans repère, que `t()` accepte tel quel. */
type LibraryOperationKey = Extract<MessageKey, `libraryError.during${string}`>

/**
 * Ce que le pilote lira : une clé, et exactement les valeurs que sa phrase attend.
 *
 * L'appariement est fait **par le type** : `libraryError.notFound` exige `{ id }`,
 * `libraryError.quota` exige `{ operation }`, et `libraryError.noIndexedDb` n'accepte
 * rien. Une clé posée avec les mauvaises valeurs ne compile pas, à l'endroit exact où
 * l'erreur est levée — et non à l'affichage, six écrans plus loin.
 */
export type LibraryProse = {
  [K in LibraryErrorKey]: MessageArgs<K> extends []
    ? { key: K; values?: undefined }
    : { key: K; values: MessageValues<K> }
}[LibraryErrorKey]

/**
 * La ligne technique posée dans `Error.message` : la clé, puis ses valeurs. Elle n'est pas
 * traduite et n'a pas à l'être — c'est ce qu'on recopie dans un rapport de bogue.
 */
function technicalLine(prose: LibraryProse): string {
  const values = prose.values as Readonly<Record<string, string | number>> | undefined
  if (values === undefined) return prose.key
  const written = Object.entries(values).map(([name, value]) => `${name}=${String(value)}`)
  return `${prose.key} ${written.join(' ')}`
}

export class LibraryError extends Error {
  readonly failure: LibraryFailure
  /** Ce qu'il faut dire au pilote — voir `libraryErrorText`. */
  readonly prose: LibraryProse

  constructor(failure: LibraryFailure, prose: LibraryProse, options?: { cause?: unknown }) {
    super(technicalLine(prose), options)
    this.failure = failure
    this.prose = prose
    // `name` sert à l'affichage d'une pile ; le tri se fait sur `failure`, jamais sur le
    // texte du message — un message est traduit, un identifiant ne l'est pas.
    this.name = 'LibraryError'
  }
}

/**
 * Reconnaît un dépassement de quota parmi les erreurs que les navigateurs lèvent.
 *
 * Trois formes, parce que les navigateurs ne s'accordent pas :
 *
 * - `DOMException` de nom `QuotaExceededError` — la forme normalisée, Chrome et Safari ;
 * - `code === 22` — la valeur héritée, encore renvoyée par de vieilles piles ;
 * - `NS_ERROR_DOM_QUOTA_REACHED` — Firefox, qui a son propre nom.
 *
 * ⚠️ **Cette fonction n'est pas éprouvée contre un vrai quota atteint.** Aucun
 * environnement de test ne sait remplir le disque d'un navigateur ; les tests
 * construisent les trois formes à la main et vérifient qu'elles sont reconnues. C'est un
 * test du tri, pas de la condition. Voir l'en-tête de `tests/library/store.test.ts`.
 */
export function isQuotaError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22
  }
  // Hors DOMException — un stockage de substitution, ou un moteur non conforme — on se
  // rabat sur le nom. Jamais sur le message : il est traduit dans la langue du navigateur.
  return error instanceof Error &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
}

/**
 * L'opération en cours quand le stockage a lâché. Un jeu fermé, et non une phrase libre :
 * c'est ce qui la rend traduisible sans qu'aucun appelant n'ait de prose à écrire.
 */
export type LibraryOperation =
  | 'open' | 'readAll' | 'readEntry' | 'readBytes' | 'write' | 'delete' | 'clear'

const OPERATION_KEYS: Readonly<Record<LibraryOperation, LibraryOperationKey>> = {
  open: 'libraryError.duringOpen',
  readAll: 'libraryError.duringReadAll',
  readEntry: 'libraryError.duringReadEntry',
  readBytes: 'libraryError.duringReadBytes',
  write: 'libraryError.duringWrite',
  delete: 'libraryError.duringDelete',
  clear: 'libraryError.duringClear'
}

/**
 * Le nom de l'opération, dans la langue du pilote. Il s'insère dans `{operation}` — donc
 * là où la langue le veut, et non collé devant par une concaténation.
 */
export function libraryOperationText(
  operation: LibraryOperation, tr: Translator
): string {
  return tr.t(OPERATION_KEYS[operation])
}

/**
 * Traduit une erreur de stockage brute en `LibraryError`. Le quota est distingué parce
 * que c'est la seule défaillance à laquelle le pilote peut répondre — en supprimant une
 * entrée, ou en exportant sa bibliothèque avant de faire de la place.
 *
 * ⚠️ `operation` est un **jeton**, pas une phrase : la prose qui va avec est au catalogue,
 * et c'est `libraryErrorText` qui l'assemble. Cette couche n'écrit pas de français.
 */
export function toLibraryError(error: unknown, operation: LibraryOperation): LibraryError {
  if (error instanceof LibraryError) return error
  if (isQuotaError(error)) {
    return new LibraryError('quota', { key: 'libraryError.quota', values: { operation } }, {
      cause: error
    })
  }
  // Le détail technique est rangé **à la fin** de la phrase, sans le « Error: » du
  // moteur : c'est l'appelant qui décide de le replier ou non.
  return new LibraryError(
    'unavailable',
    { key: 'libraryError.storageFailed', values: { operation, detail: technicalDetail(error) } },
    { cause: error }
  )
}

/**
 * La phrase à montrer au pilote, dans sa langue.
 *
 * ```ts
 * catch (error) {
 *   if (error instanceof LibraryError) say(libraryErrorText(error, tr))
 * }
 * ```
 *
 * Deux valeurs sont **finies ici** plutôt qu'à la levée, parce qu'elles n'ont de sens
 * qu'une fois la langue connue :
 *
 * - `operation` est rangé comme **jeton** (`'write'`) et devient ici « Écriture d'une
 *   entrée » ;
 * - un `detail` vide — la panne n'a rien dit — reçoit la prose que
 *   `formatTechnicalDetail` emploierait : une phrase qui s'arrête sur un blanc se lirait
 *   comme un affichage raté.
 */
export function libraryErrorText(error: LibraryError, tr: Translator): string {
  return libraryProseText(error.prose, tr)
}

/**
 * La même phrase, pour une prose qui n'est pas portée par une exception : la raison d'un
 * enregistrement illisible (`BrokenEntry`), celle d'une entrée refusée à l'import
 * (`ImportResult`). Ces deux-là **n'interrompent rien** — la bibliothèque continue de
 * s'afficher —, elles ont donc une prose sans erreur autour.
 */
export function libraryProseText(prose: LibraryProse, tr: Translator): string {
  const values = prose.values as Readonly<Record<string, string | number>> | undefined
  const filled: Record<string, string | number> = { ...values }
  if (typeof filled.operation === 'string') {
    filled.operation = libraryOperationText(filled.operation as LibraryOperation, tr)
  }
  if (filled.detail === '') filled.detail = tr.t('model.noErrorMessage')
  // Même situation que dans `makeTranslator` : la clé est encore générique ici, et le
  // compilateur ne peut pas réduire le type conditionnel de ses arguments. L'appariement,
  // lui, a déjà été vérifié — c'est `LibraryProse` qui l'impose à la construction.
  const translate = tr.t as (key: LibraryErrorKey, values?: unknown) => string
  return translate(prose.key, filled)
}
