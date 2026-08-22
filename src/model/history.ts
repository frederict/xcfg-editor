import type { JsonNode } from '../core/jsonDocument'
import { cloneNode } from './mutations'

/**
 * Historique d'annulation et de rétablissement.
 *
 * ## Le choix : instantanés structurels, pas un journal d'opérations inverses
 *
 * Les primitives de `mutations.ts` opèrent par effet de bord sur le document vivant —
 * elles ne rendent pas de quoi se défaire elles-mêmes. Deux familles s'offraient :
 *
 * - **Journal d'opérations inverses** : à chaque mutation, mémoriser assez pour la
 *   rejouer à l'envers (l'ancien texte source d'une coordonnée, l'index de retrait d'un
 *   widget déplacé…). Économe, et préserve les références de nœuds que l'interface
 *   détient. Mais `mutations.ts` n'a pas été conçu pour cela : `setWidgetBounds` écrit
 *   une à quatre coordonnées choisies par l'appelant, `moveWidgetToPage` retire d'un
 *   tableau et insère dans un autre… il faudrait, pour chaque primitive, un miroir qui
 *   sait s'inverser, et la moindre asymétrie entre l'aller et le retour est une
 *   corruption silencieuse — précisément le risque que ce projet refuse de courir sur
 *   la fidélité au fichier.
 * - **Instantanés du texte source** : sérialiser le document avant chaque mutation, le
 *   reparser pour annuler. Sûr par construction — on ne rejoue rien, on revient — mais
 *   un aller-retour texte → arbre → texte à chaque pas, et il reconstruit un arbre
 *   entièrement neuf : toute référence de nœud que l'interface détenait (le widget
 *   sélectionné, par exemple) devient orpheline.
 *
 * Cette implémentation retient une **troisième voie**, variante moins coûteuse de la
 * deuxième : l'instantané n'est pas du texte à reparser, mais une **copie structurelle**
 * du document (`cloneNode`, déjà écrite et éprouvée dans `mutations.ts`). `cloneNode`
 * recopie chaque nœud un à un, clé par clé, en conservant le texte source de chaque
 * littéral — la garantie de fidélité est donc la même que pour un instantané texte
 * (aucune valeur n'est recalculée, seulement recopiée), sans repasser par le
 * sérialiseur ni le parseur à chaque pas. Le coût mémoire reste celui d'un instantané :
 * un fichier de 79 Ko, quelques dizaines de pas par session (cf. borne plus bas), c'est
 * un total négligeable au regard de ce que fait tourner un navigateur.
 *
 * La perte de références de nœuds subsiste : après `undo()` ou `redo()`, le document
 * rendu par `current()` est un **nouvel arbre**, distinct de celui d'avant l'appel.
 * L'appelant ne doit conserver aucune référence de nœud à travers un `undo`/`redo` — il
 * doit la retrouver dans le nouvel arbre (par chemin, par index) plutôt que par
 * identité d'objet. C'est le prix assumé de cette conception : la fidélité prime sur la
 * commodité de l'interface, comme le veut ce projet.
 *
 * ## Pourquoi pas des instantanés texte purs, alors ?
 *
 * Parce que `cloneNode` offre la même garantie sans repasser par `serializeJson` et
 * `parseJson` à chaque mutation — ceux-ci ne servent qu'à la comparaison finale (les
 * tests) et à l'export réel. Le coût et le risque (un bug de parseur invisible dans la
 * boucle d'annulation) sont tous deux moindres.
 */

/** Un pas d'historique documente sa mutation pour l'affichage (« Déplacer Altitude GPS »). */
export interface EditHistory {
  /** Le document vivant : à muter avec `mutations.ts`, puis à passer à `record`. */
  current(): JsonNode
  /**
   * Enregistre l'état courant de `current()` comme un nouveau pas, sous ce libellé.
   * Coupe toute branche de rétablissement au-delà du pas courant — la mutation qui
   * suit une annulation rend l'ancien « refaire » inatteignable, comme dans tout
   * éditeur linéaire.
   */
  record(description: string): void
  /** Revient au pas précédent et rend le document à cet état. Lève si `canUndo()` est faux. */
  undo(): JsonNode
  /** Avance au pas suivant et rend le document à cet état. Lève si `canRedo()` est faux. */
  redo(): JsonNode
  canUndo(): boolean
  canRedo(): boolean
  /** Ce que `undo()` défairait — pour l'étiquette du menu (« Annuler : Déplacer… »). */
  undoDescription(): string | undefined
  /** Ce que `redo()` referait — même usage, pour « Rétablir : … ». */
  redoDescription(): string | undefined
  /** Vrai si le document diffère de son état d'origine : active l'export, prévient avant de fermer. */
  isDirty(): boolean
  /**
   * Un numéro qui change à **chaque** pas franchi — enregistré, annulé ou rétabli — et qui
   * ne revient jamais en arrière.
   *
   * Il sert à répondre à une question, et à une seule : « le document est-il encore celui
   * qu'on a écrit sur le disque ? ». C'est ce qui permet à `beforeunload` de ne retenir le
   * pilote que s'il a **vraiment** quelque chose à perdre, au lieu de le retenir sur la foi
   * d'un `modified` qui reste vrai pour toujours une fois qu'il est vrai.
   *
   * ⚠️ **Ce n'est pas le rang du curseur, et il ne faut pas le confondre.** Annuler puis
   * modifier autrement ramène le curseur au même rang sur un document différent : deux
   * états distincts porteraient le même repère, et l'un se ferait passer pour l'autre.
   * Ce compteur ne redescend jamais, au prix assumé d'un faux positif — revenir par
   * annulation à l'état exactement enregistré fait quand même paraître l'avertissement.
   * C'est le sens prudent, et `isDirty()` couvre déjà le seul cas qui compte, le retour à
   * l'état d'origine.
   */
  revision(): number
}

/**
 * Borne sur le nombre de pas conservés.
 *
 * Une session type compte « quelques dizaines » de modifications (cf. l'énoncé du
 * jalon). 100 pas offre une marge de 2 à 3 fois ce volume observé, tout en bornant le
 * pire cas mémoire : chaque pas est une copie structurelle complète du document — pour
 * le plus gros fichier du corpus (79 Ko sérialisés, un peu plus une fois éclaté en
 * objets JS), une centaine de pas reste de l'ordre de quelques Mo, sans commune mesure
 * avec ce qu'un navigateur tolère. Au-delà, les pas les plus anciens sont perdus
 * silencieusement quant à l'annulation (le document courant, lui, n'est jamais
 * affecté) : `isDirty()` reste vrai en permanence dès qu'une purge a eu lieu, puisqu'il
 * n'est alors plus possible de revenir à l'état d'origine par annulation.
 */
export const HISTORY_LIMIT = 100

export function createHistory(initial: JsonNode, limit: number = HISTORY_LIMIT): EditHistory {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`createHistory : limite invalide (${limit})`)
  }

  // `live` est le document que l'appelant mute par effet de bord ; les entrées de
  // `snapshots` sont des copies indépendantes, jamais le même objet que `live` — sans
  // quoi une mutation menée après un `record()` mais avant le suivant corromprait
  // l'instantané déjà archivé (ils partageraient les mêmes nœuds).
  let live = cloneNode(initial)
  const snapshots: JsonNode[] = [cloneNode(initial)]
  const descriptions: string[] = []
  let cursor = 0
  let prunedOrigin = false
  // Voir `EditHistory.revision` : monotone, jamais le rang du curseur.
  let revision = 0

  function canUndo(): boolean {
    return cursor > 0
  }

  function canRedo(): boolean {
    return cursor < snapshots.length - 1
  }

  return {
    current: () => live,

    record(description: string): void {
      if (description.trim() === '') throw new Error('History.record : description vide')

      // Coupe la branche de rétablissement : tout ce qui suivait le pas courant.
      snapshots.length = cursor + 1
      descriptions.length = cursor

      snapshots.push(cloneNode(live))
      descriptions.push(description)
      cursor++
      revision++

      while (snapshots.length > limit + 1) {
        snapshots.shift()
        descriptions.shift()
        cursor--
        prunedOrigin = true
      }
    },

    undo(): JsonNode {
      if (!canUndo()) throw new Error('History.undo : rien à annuler')
      cursor--
      revision++
      live = cloneNode(snapshots[cursor]!)
      return live
    },

    redo(): JsonNode {
      if (!canRedo()) throw new Error('History.redo : rien à rétablir')
      cursor++
      revision++
      live = cloneNode(snapshots[cursor]!)
      return live
    },

    canUndo,
    canRedo,
    undoDescription: () => (canUndo() ? descriptions[cursor - 1] : undefined),
    redoDescription: () => (canRedo() ? descriptions[cursor] : undefined),
    isDirty: () => prunedOrigin || cursor !== 0,
    revision: () => revision
  }
}
