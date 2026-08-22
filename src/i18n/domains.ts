import type { PluralForms } from './plural'
import type { FrenchApp } from './messages/fr/app'
import type { FrenchCommon } from './messages/fr/common'
import type { FrenchLibrary } from './messages/fr/library'
import type { FrenchModel } from './messages/fr/model'
import type { FrenchPages } from './messages/fr/pages'
import type { FrenchPreferences } from './messages/fr/preferences'
import type { FrenchSharing } from './messages/fr/sharing'
import type { FrenchVersions } from './messages/fr/versions'
import type { FrenchWidgets } from './messages/fr/widgets'

/**
 * # Les domaines : un fichier par groupe d'écrans, dans chacune des cinq langues
 *
 * ## Pourquoi ce découpage existe
 *
 * L'extraction des messages de `src/ui/` est confiée à **plusieurs personnes en
 * parallèle**, une par groupe d'écrans. Un catalogue d'une seule pièce leur ferait écrire
 * toutes leurs clés dans le même fichier, dans les cinq langues : cinq points de conflit
 * permanents, et une relecture impossible à découper.
 *
 * Un domaine est donc **un lot de travail**, pas une catégorie sémantique. La question à
 * laquelle il répond est « **qui écrit dans ce fichier ?** », et la réponse doit être une
 * seule personne à la fois.
 *
 * | Domaine | Ce qu'il couvre |
 * |---|---|
 * | `common` | le vocabulaire employé par **plusieurs** domaines — voir l'avertissement plus bas |
 * | `app` | `main.ts`, `views.ts`, `editor.ts` |
 * | `preferences` | `preferencesPage.ts` |
 * | `library` | `libraryPanel.ts` |
 * | `widgets` | `properties.ts`, `widgetPalette.ts`, `widgetList.ts` |
 * | `versions` | `versionDiagnostic.ts`, `cleanupPanel.ts` |
 * | `sharing` | `sharingDialog.ts`, `warnings.ts` |
 * | `pages` | `pageManager.ts`, `deviceSelector.ts` |
 * | `model` | la prose **hors interface** : `src/model/`, `src/library/`, `src/catalog/`, `src/render/` |
 *
 * ⚠️ **`common` n'est pas un fourre-tout.** Il est le seul fichier que plusieurs lots
 * peuvent vouloir toucher, donc le seul qui puisse redevenir un point de conflit. Un mot
 * n'y entre que s'il est déjà employé par deux domaines au moins, et jamais « au cas
 * où » : deux clés voisines dans deux domaines coûtent moins cher qu'un conflit sur ce
 * fichier-ci. Voir `src/i18n/CLAUDE.md`.
 *
 * ## Ce que le découpage ne change pas
 *
 * - **Le jeu de clés reste plat.** `t('library.entryCount')` s'écrit comme avant : le
 *   domaine est une affaire de fichier, pas d'appel. Un message qui change de domaine
 *   garde donc sa clé, et aucun appelant ne bouge.
 * - **Le français reste la langue d'écriture.** Le type de chaque domaine est dérivé du
 *   fichier français correspondant : une clé ajoutée en français et oubliée dans une des
 *   quatre autres langues est une **erreur de compilation**, exactement comme avant le
 *   découpage — et l'erreur désigne maintenant le fichier et la langue, au lieu du
 *   catalogue entier.
 * - **Une langue, un morceau téléchargé.** Les neuf domaines d'une langue sont réunis par
 *   son `index.ts`, que Vite fond dans le morceau de cette langue. Le pilote en télécharge
 *   toujours **un seul**, et il porte les neuf domaines — voir `catalog.ts`, qui explique
 *   pourquoi on ne va pas jusqu'à charger un domaine à la demande.
 */

/** Les domaines, dans l'ordre où la table ci-dessus les présente. */
export const DOMAINS = [
  'common',
  'app',
  'preferences',
  'library',
  'widgets',
  'versions',
  'sharing',
  'pages',
  'model'
] as const

export type Domain = (typeof DOMAINS)[number]

/**
 * Le type du catalogue français de chaque domaine. C'est **la** source de vérité du jeu de
 * clés, domaine par domaine : les quatre autres langues s'y conforment ou ne compilent
 * pas.
 */
export interface FrenchDomains {
  common: FrenchCommon
  app: FrenchApp
  preferences: FrenchPreferences
  library: FrenchLibrary
  widgets: FrenchWidgets
  versions: FrenchVersions
  sharing: FrenchSharing
  pages: FrenchPages
  model: FrenchModel
}

/**
 * Ce qu'un fichier de domaine doit porter dans une langue autre que le français : les
 * mêmes clés que le français, dans la même forme — figée là où le français est figé, au
 * pluriel là où il est au pluriel.
 *
 * ```ts
 * const library: DomainCatalog<'library'> = { … }   // en/library.ts
 * ```
 *
 * Une clé manquante, une clé en trop, un pluriel écrit comme une chaîne : trois erreurs de
 * compilation, sur la ligne fautive du fichier fautif.
 */
export type DomainCatalog<D extends Domain> = {
  [K in keyof FrenchDomains[D]]: FrenchDomains[D][K] extends string ? string : PluralForms
}

/**
 * Les **préfixes de clé** qu'un domaine a le droit de porter — le premier segment, avant
 * le point.
 *
 * C'est ce qui répond mécaniquement à « où ajouter cette clé ? » et à « où est-elle
 * déjà ? » : un préfixe appartient à un domaine et à un seul, et
 * `tests/i18n/domains.test.ts` le vérifie. Sans cette table, deux lots pourraient définir
 * `library.entryCount` dans deux fichiers, et la fusion en garderait silencieusement un.
 *
 * Le préfixe nomme le **sujet**, pas le fichier : `action.redo` vit dans `app` parce que
 * la barre d'outils est dans `app`, et il continue de s'appeler `action.redo` parce que
 * c'est ce que la clé désigne. Renommer les préfixes pour qu'ils collent aux domaines
 * ferait perdre l'information sans rien apporter.
 *
 * Les préfixes sont déclarés **à l'avance**, y compris pour les domaines encore vides :
 * un lot qui commence ne doit pas avoir à toucher ce fichier-ci, sans quoi le point de
 * conflit se déplace ici.
 */
export const DOMAIN_PREFIXES: Readonly<Record<Domain, readonly string[]>> = {
  common: ['common', 'provenance', 'factoryValue'],
  app: ['action', 'app', 'dock', 'editor', 'landing', 'menu', 'pageKind', 'view', 'zoom'],
  // `inputDevice` : les quatre périphériques d'entrée que le noyau d'un boîtier déclare,
  // dits dans la langue du pilote. Une famille de valeurs fermée, donc son propre préfixe.
  preferences: ['inputDevice', 'preferences'],
  library: ['library'],
  widgets: ['palette', 'properties', 'widgets'],
  versions: ['cleanup', 'removalEffect', 'versions'],
  sharing: ['sharing', 'warnings'],
  // ⚠️ Pas de préfixe `navigation` ici, et il ne doit pas y revenir : les cinq noms de
  // navigation sont des **libellés de XCTrack**, ils suivent l'axe `labels` et vivent
  // dans `src/catalog/navigationLabels.json`. Ils ont été déclarés sous `navigation.*`
  // jusqu'au 2026-08-22, et quatre des cinq ne disaient pas ce que l'appareil dit.
  pages: ['device', 'pages'],
  // ⚠️ `render` ne porte QUE ce que le rendu **ajoute** au dessin de l'appareil : les deux
  // étiquettes de survol, qui sont notre prose et suivent donc l'axe `ui`. Tout ce que le
  // dessin peint — noms de gadgets, suffixes de titre, textes que XCTrack écrit lui-même —
  // suit l'axe `labels` et n'entre jamais ici. Voir `src/render/canvas.ts`.
  model: [
    'model', 'personal', 'personalBasis', 'personalHome', 'personalKind', 'personalReason',
    'sharingReason', 'suspectClue', 'ruleTitle', 'ruleSummary', 'inspection', 'libraryError',
    'reachability', 'render'
  ]
}

/** Le premier segment d'une clé : `library.entryCount` donne `library`. */
export function keyPrefix(key: string): string {
  const cut = key.indexOf('.')
  return cut === -1 ? key : key.slice(0, cut)
}
