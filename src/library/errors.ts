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
 * jamais avec un booléen, jamais en silence. `failure` dit quoi, `message` dit quoi faire
 * en français, `cause` garde l'erreur d'origine pour le rapport de bogue.
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

import { formatTechnicalDetail } from '../core/technicalDetail'

export class LibraryError extends Error {
  readonly failure: LibraryFailure

  constructor(failure: LibraryFailure, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.failure = failure
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
 * Traduit une erreur de stockage brute en `LibraryError`. Le quota est distingué parce
 * que c'est la seule défaillance à laquelle le pilote peut répondre — en supprimant une
 * entrée, ou en exportant sa bibliothèque avant de faire de la place.
 */
export function toLibraryError(error: unknown, context: string): LibraryError {
  if (error instanceof LibraryError) return error
  if (isQuotaError(error)) {
    return new LibraryError(
      'quota',
      `${context} : le navigateur a refusé d’écrire, l’espace accordé à ce site est plein. ` +
      'Exportez votre bibliothèque, puis supprimez des entrées pour faire de la place.',
      { cause: error }
    )
  }
  // Le message garde le contexte en clair et le détail technique **à la fin**, sans le
  // « Error: » du moteur : c'est l'appelant qui décide de le replier ou non.
  return new LibraryError(
    'unavailable',
    `${context} : le navigateur n’a pas pu répondre. ${formatTechnicalDetail(error)}`,
    { cause: error }
  )
}
