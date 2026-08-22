import { LibraryError } from './errors'

/**
 * Le contrat de rangement — et la raison pour laquelle il ne ressemble pas à
 * `localStorage`.
 *
 * ## Pourquoi IndexedDB, chiffres à l'appui
 *
 * Les tailles sont celles des fixtures versionnées, qui sont des exports réels
 * anonymisés :
 *
 * | Fichier | Octets |
 * |---|---|
 * | `2026-08-20_backup-00.xcfg` | 78 642 |
 * | `2026-08-20_pages-00.xcfg` | 57 982 |
 * | `2025-07-07_backup-00.xcfg` | 72 905 |
 * | `2026-08-20_backupwithmedia-00.xczfg` (archive) | 7 794 |
 *
 * Soit **~58 à 79 ko par entrée**, avant tout aperçu.
 *
 * **`localStorage` est éliminé par deux propriétés, pas par goût :**
 *
 * 1. **Il ne prend que du texte.** Ranger des octets y impose un encodage — base64,
 *    +33 % — soit 105 ko pour un backup de 79 ko. Et surtout, tout encodage est une
 *    occasion de plus de perdre des octets, dans un projet dont c'est la promesse
 *    centrale. IndexedDB range un `Uint8Array` **tel quel**, par clonage structuré :
 *    aucune conversion, donc aucune conversion à prouver.
 * 2. **Son quota est de 5 Mo par origine** dans tous les navigateurs courants, et il
 *    est **partagé** avec ce que l'éditeur y range déjà (`xcfg-editor.devices`). À
 *    105 ko l'entrée encodée, cela plafonne à **~47 entrées sans aucun aperçu**, et à
 *    une petite quinzaine dès qu'un aperçu PNG accompagne chaque entrée. La consigne
 *    parle d'une vingtaine d'entrées avec aperçus : on serait déjà au bord.
 *    Le quota IndexedDB se compte en **pourcentage de l'espace disque libre** (60 % du
 *    disque chez Chrome, ~10 Go typiques ; 10 % chez Firefox ; ~1 Go chez Safari) : à
 *    79 ko l'entrée, **des dizaines de milliers d'entrées**, et le plafond cesse d'être
 *    la question.
 *
 * Deux propriétés secondaires achèvent le choix, et aucune n'est disponible dans
 * `localStorage` : l'API est **asynchrone**, donc ranger 79 ko ne fige pas l'affichage ;
 * et une **transaction** couvre plusieurs écritures, ce qui est ce qui empêche une entrée
 * d'exister à moitié — métadonnées écrites, octets perdus.
 *
 * ## Deux magasins, et non un seul
 *
 * Les métadonnées (`entries`) et les octets (`blobs`) sont séparés. Afficher la
 * bibliothèque ne doit pas charger 20 × 79 ko en mémoire pour n'afficher que des noms :
 * `readAll()` ne touche jamais les octets. C'est la seule raison de la séparation, et
 * elle suffit.
 *
 * ## Ce que l'interface **n'a pas**, volontairement
 *
 * Pas de `list()` qui rendrait des objets typés : `readAll()` rend de l'`unknown`. Un
 * enregistrement rangé hier par une version antérieure, ou abîmé, ne doit pas pouvoir
 * faire échouer la lecture de tous les autres — c'est la validation appelante qui trie,
 * entrée par entrée (voir `library.ts`, `readSnapshot`).
 */

/** Un enregistrement de métadonnées porte au minimum son identifiant et sa révision. */
export interface StoredRecord {
  id: string
  revision: number
  [key: string]: unknown
}

/** Les octets à écrire dans la même transaction que l'enregistrement. */
export interface BlobWrite {
  key: string
  bytes: Uint8Array
}

/**
 * Ce que l'appelant croit trouver en place, vérifié **dans la transaction d'écriture**.
 *
 * C'est le mécanisme anti-concurrence : deux onglets ouverts sur la même bibliothèque
 * lisent la même entrée à la révision 3 ; le premier qui écrit passe à 4, le second se
 * voit refuser son écriture au lieu d'écraser en silence le renommage de l'autre.
 *
 * - `absent` — création : l'identifiant ne doit exister nulle part.
 * - `revision` — mise à jour : l'entrée doit être exactement à cette révision.
 * - `any` — écriture inconditionnelle, réservée à l'import qui rétablit une sauvegarde.
 */
export type ExpectedRevision =
  | { kind: 'absent' }
  | { kind: 'revision'; value: number }
  | { kind: 'any' }

export interface LibraryStore {
  /**
   * Faux quand les données ne survivront pas à la fermeture de l'onglet. L'interface doit
   * le dire au pilote : une bibliothèque non durable est un brouillon, pas une sauvegarde.
   */
  readonly durable: boolean

  /** Tous les enregistrements, **non validés**. Ne lit aucun octet. */
  readAll(): Promise<unknown[]>

  /** Un enregistrement, **non validé**. `undefined` si l'identifiant n'existe pas. */
  read(id: string): Promise<unknown | undefined>

  readBlob(key: string): Promise<Uint8Array | undefined>

  /** Écrit l'enregistrement et ses octets en une transaction, ou ne fait rien du tout. */
  put(record: StoredRecord, blobs: BlobWrite[], expected: ExpectedRevision): Promise<void>

  /**
   * Retire l'entrée et **tout** ce qui lui appartient : les octets rangés sous `id`, et
   * ceux rangés sous `id#…` — l'aperçu aujourd'hui, ce qu'on y ajoutera demain. Un
   * magasin qui n'effacerait que la clé exacte laisserait derrière lui des octets
   * orphelins qu'aucune entrée ne référence plus, et le quota s'épuiserait sans que rien
   * ne l'explique.
   */
  delete(id: string): Promise<void>

  clear(): Promise<void>

  close(): void
}

/** Clé des octets d'une entrée. */
export const blobKey = (id: string): string => id

/**
 * Clé de l'aperçu d'une entrée. Le rendu appartient à `src/render/`, qui n'est pas de ce
 * périmètre : **la place est réservée, l'image n'est pas produite ici**. Le préfixe
 * partagé avec `blobKey` est ce qui permet à `delete` de tout retirer d'un coup.
 */
export const previewKey = (id: string): string => `${id}#preview`

/** Vrai si `key` désigne les octets d'une entrée ou l'une de ses annexes. */
export function belongsTo(key: string, id: string): boolean {
  return key === id || key.startsWith(`${id}#`)
}

export function conflictError(id: string, expected: ExpectedRevision): LibraryError {
  if (expected.kind === 'absent') {
    return new LibraryError('conflict', { key: 'libraryError.duplicateId', values: { id } })
  }
  return new LibraryError('conflict', { key: 'libraryError.changedElsewhere', values: { id } })
}
