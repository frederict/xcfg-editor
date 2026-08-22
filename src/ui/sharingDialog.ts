import './sharingDialog.css'
import { readableName } from '../catalog/widgetNames'
import type { JsonNode } from '../core/jsonDocument'
import { serializeJson } from '../core/serializeJson'
import {
  anonymizeBackup,
  anonymizeDocument,
  buildExportFileName,
  carriesPreferences,
  changedPreferenceCount,
  documentExportType,
  tallyPreferences,
  type FreeTextReplacement,
  type PersonalSuspect,
  type PreferenceOutcome,
  type PreferenceTally
} from '../model/sharing'
import {
  collectPersonalData,
  personalHomeLabel,
  personalValueText,
  PERSONAL_CAVEAT,
  PERSONAL_KIND_LABELS,
  type PersonalInventory
} from '../model/personalData'
import { plural, proseFormat } from './prose'

/**
 * L'interface d'**export partageable** : choisir ce qu'on donne, voir ce qui est remplacé,
 * obtenir un nom qui ne dit rien du pilote.
 *
 * ## Le principe, et il n'y en a qu'un : montrer avant de faire
 *
 * C'est la règle du projet, celle qui commande déjà `warnings.ts` (« on signale, on ne
 * corrige jamais ») et la dérivation `backup` → `pages` de `scope.ts`. Un pilote qui
 * partage sa configuration doit voir **ce qui part** et **ce qui est remplacé**, avec
 * l'emplacement de chaque texte, pour pouvoir vérifier lui-même. La liste des onze clés
 * de texte libre est statique et se périmera ; l'inventaire montré, lui, est calculé sur
 * le fichier qu'on a sous la main. **C'est l'inventaire la parade, pas le code.**
 *
 * ## Trois issues, et l'ordre est celui de ce qui part
 *
 * `plain` donne tout, `backup` donne tout sauf ce qui vous désigne, `pages` ne donne que
 * les pages. Descendre d'un cran veut donc toujours dire « donner moins », et c'est la
 * seule chose que le pilote ait à retenir pour choisir.
 *
 * La troisième issue est née d'un manque mesuré : un pilote qui veut de l'aide sur ses
 * réglages de vario n'avait le choix qu'entre tout envoyer avec son nom, ou n'envoyer que
 * ses pages — c'est-à-dire aucun réglage, donc aucune question. Chaque issue porte son
 * inventaire **sous sa propre carte**, replié tant qu'elle n'est pas choisie : trois choix
 * ne doivent pas coûter trois fois plus à lire.
 *
 * ## L'export ordinaire ne passe pas par ici, et c'est la raison de la forme retenue
 *
 * La fidélité à l'octet près est la promesse du projet. Ce module ne fabrique donc
 * **aucun octet** sur le chemin ordinaire : quand le pilote choisit sa configuration telle
 * qu'elle est, `SharingResult.document` vaut `undefined` et l'appelant réémet ce que
 * `exportContainer` lui rend — les octets d'origine, inchangés. Ouvrir cette boîte,
 * la refermer et exporter rend la même empreinte SHA-256 qu'un export direct, parce que
 * rien ici n'a touché au conteneur : `planSharing` travaille sur une copie
 * (`anonymizeDocument` clone), et cette copie est jetée avec la boîte si le pilote
 * renonce.
 *
 * L'anonymisation, elle, est une **modification demandée** : elle a le droit de changer
 * les octets, et elle seule.
 *
 * ⚠️ **Ce que la boîte a le droit de promettre dépend de `source.modified`.** « Le fichier
 * part tel quel, à l'octet près » est vrai d'un document intact — les octets ouverts sont
 * réémis sans être réécrits — et **faux** d'un document que le pilote a modifié : celui-là
 * est sérialisé, donc ses octets changent, et son empreinte avec. L'annoncer autrement
 * serait mentir à l'instant précis où le pilote décide s'il ose cliquer, et sur la
 * propriété qui est l'argument central du projet. Voir `FIDELITY_UNCHANGED` et
 * `FIDELITY_MODIFIED` : la garantie n'est pas nuancée, elle est dite juste dans chacun des
 * deux cas.
 *
 * ## Ce module ne connaît ni l'état de l'application, ni le moment
 *
 * `renderSharingDialog` reçoit tout ce dont elle a besoin et rend une poignée. C'est
 * l'assembleur qui décide quand ouvrir, où poser l'élément, et ce qu'il fait du résultat.
 * Aucun accès à `localStorage`, aucune variable de module, aucun `new Date()` caché —
 * l'horloge est injectable, sans quoi les tests de nom de fichier seraient à la merci de
 * la seconde qui passe.
 */

/* ========================================================================= le plan */

/** Une annexe d'archive `.xczfg` : ce que le conteneur transporte en plus du `.xcfg`. */
export interface SharingExtra {
  name: string
  byteLength: number
}

/** Ce que l'appelant sait du fichier ouvert. Rien de plus n'est nécessaire. */
export interface SharingSource {
  /**
   * Le document **tel qu'il sera exporté**, modifications d'édition comprises. Il n'est
   * jamais modifié : l'anonymisation travaille sur une copie.
   */
  document: JsonNode
  /** Le nom du fichier ouvert. Sert à retrouver l'extension, jamais à composer le nom. */
  fileName: string
  /** Le conteneur ouvert. Une archive porte des annexes ; un `.xcfg` nu, non. */
  kind: 'xcfg' | 'xczfg'
  /** Les annexes de l'archive, hors le `.xcfg` principal. Vide ou absent pour un `.xcfg`. */
  extras?: readonly SharingExtra[]
  /**
   * `container.modified` : vrai si le pilote a touché au document depuis l'ouverture.
   *
   * **C'est ce qui décide de ce que la boîte a le droit de promettre.** Un document
   * intact ressort à l'octet près — `exportContainer` réémet les octets d'origine, sans
   * les réécrire, et l'empreinte du fichier produit est celle du fichier ouvert. Un
   * document modifié est **sérialisé**, donc ses octets changent : l'annoncer « tel quel,
   * à l'octet près » serait faux au moment précis où le pilote décide s'il ose cliquer,
   * et sur la propriété qui est l'argument central du projet.
   *
   * Absent : la boîte suppose le cas prudent — un document modifié. On n'affirme jamais
   * la garantie forte faute d'information ; c'est l'appelant qui la tient, et le noyau
   * qui la tient vraiment (`exportContainer`, `core/container.ts`).
   */
  modified?: boolean
}

/**
 * Les trois issues, nommées.
 *
 * ## Pourquoi il en faut trois, et pas deux
 *
 * Les deux premières laissaient sans réponse le cas le plus courant : *demander de l'aide
 * sur ses réglages de vario sans publier son nom*. `plain` emporte le nom avec le reste ;
 * `pages` n'emporte aucun réglage, donc aucune question à poser. `backup` est la troisième
 * : la sauvegarde entière, dont les données personnelles sont **remplacées** au lieu que le
 * bloc soit retiré.
 *
 * L'ordre des trois est celui de ce qui part : tout, puis tout sauf vous, puis vos pages
 * seules. C'est le seul ordre où descendre d'un cran veut toujours dire « donner moins ».
 */
export type SharingForm = 'plain' | 'backup' | 'pages'

/** Ce que produirait l'export « pages » anonymisé, calculé mais pas encore livré. */
export interface PagesPlan {
  /** La copie anonymisée. La source n'a pas bougé. */
  document: JsonNode
  /** Le nom du fichier produit — toujours une extension `.xcfg`, voir plus bas. */
  fileName: string
  /** Ce qui sera remplacé, dans l'ordre du fichier. */
  replacements: FreeTextReplacement[]
  /** Les sections de premier niveau écartées par la dérivation `backup` → `pages`. */
  droppedRootKeys: string[]
  /** Vrai si le format change, c'est-à-dire si la source n'était pas déjà un `pages`. */
  derived: boolean
  /** Les annexes de l'archive qui ne partiront pas — voir `ANNEXES_NOTE`. */
  droppedExtras: readonly SharingExtra[]
  /** Ce qui ressemble à une donnée personnelle sans être déclaré, dans ce qui part. */
  suspects: PersonalSuspect[]
}

/** Ce que produirait la sauvegarde entière aux données personnelles remplacées. */
export interface BackupPlan {
  document: JsonNode
  fileName: string
  /** Les textes des gadgets remplacés — le même geste que pour un « pages ». */
  replacements: FreeTextReplacement[]
  /** Ce qu'il advient de chaque réglage personnel des préférences, dans l'ordre du fichier. */
  preferences: PreferenceOutcome[]
  /** Les quatre chiffres du traitement des préférences, nommés. */
  tally: PreferenceTally
  /** Combien de lignes changent en tout — préférences traitées et textes de gadgets. */
  changed: number
  suspects: PersonalSuspect[]
  /** Les annexes de l'archive qui ne partiront pas — même raison que pour un « pages ». */
  droppedExtras: readonly SharingExtra[]
}

export interface SharingPlan {
  /** Le nom que porterait un export ordinaire. Aucun octet n'est calculé pour celui-là. */
  plainFileName: string
  /** Vrai si le document a bougé depuis l'ouverture — voir `SharingSource.modified`. */
  modified: boolean
  /** Le format déclaré par la source : `backup`, `pages`, ou `undefined` s'il est muet. */
  exportType: string | undefined
  /**
   * Les issues effectivement proposées, dans l'ordre de ce qui part.
   *
   * `backup` en est absente quand le fichier ne porte pas de préférences : elle rendrait
   * alors exactement le même document que `pages`, sous le même nom. Proposer deux fois le
   * même choix est pire qu'en proposer un de moins — le pilote cherche la différence, ne
   * la trouve pas, et se met à douter du reste de la boîte.
   */
  forms: readonly SharingForm[]
  /** La sauvegarde entière, données personnelles remplacées. */
  backup: BackupPlan
  /** L'export « pages », textes des gadgets remplacés. */
  pages: PagesPlan
  /**
   * Ce que le fichier porte de personnel, **en entier** — préférences comprises.
   *
   * Sans ce champ, « aucun texte personnalisé à remplacer » se lisait « rien de personnel
   * dans ce fichier », ce qui est faux d'un `backup` : le nom du pilote, sa voile, ses
   * capteurs appairés et sa tâche en cours vivent dans les préférences. L'inventaire vient
   * de `model/personalData.ts`, le même que la bibliothèque et la page des réglages ; les
   * chiffres se recoupent donc au lieu de se contredire.
   */
  personal: PersonalInventory
}

/**
 * Calcule les trois issues possibles **sans rien livrer**. Fonction pure, hors DOM : c'est
 * elle que les tests exercent sur les fichiers réels.
 *
 * `when` est l'instant qui datera le nom. Le nom est unique **à la seconde** : deux appels
 * programmatiques dans la même seconde rendraient le même nom. À travers une boîte de
 * dialogue le cas n'est pas atteignable — il faudrait deux confirmations à moins d'une
 * seconde d'intervalle — et le navigateur suffixe de lui-même une collision dans le
 * dossier de téléchargements. C'est dit ici parce qu'un appelant programmatique, lui,
 * pourrait y tomber.
 *
 * Les deux issues anonymisantes sortent en **`.xcfg` nu**, archive ou non, et pour la même
 * raison : cet éditeur n'inspecte pas les annexes d'un `.xczfg` — voir `ANNEXES_NOTE`.
 */
export function planSharing(source: SharingSource, when: Date): SharingPlan {
  const exportType = documentExportType(source.document)
  const pages = anonymizeDocument(source.document)
  const backup = anonymizeBackup(source.document)
  const personal = collectPersonalData(source.document)
  const droppedExtras = source.kind === 'xczfg' ? (source.extras ?? []) : []

  // `originalFileName` est volontairement omis pour les deux issues anonymisantes :
  // le fichier produit est toujours un `.xcfg` nu, et `fileExtension` rend alors
  // `DEFAULT_EXTENSION`. Le format écrit dans le nom, lui, distingue les deux :
  // `backup-anon` porte les réglages, `pages-anon` non — et confondre les deux, c'est
  // écraser les préférences du destinataire.
  const anonymousName = (document: JsonNode): string => buildExportFileName({
    when,
    exportType: documentExportType(document),
    anonymized: true
  })

  return {
    plainFileName: buildExportFileName({
      originalFileName: source.fileName,
      when,
      exportType
    }),
    // Prudent par défaut : sans information, on n'annonce pas la garantie forte.
    modified: source.modified !== false,
    exportType,
    forms: carriesPreferences(source.document)
      ? ['plain', 'backup', 'pages']
      : ['plain', 'pages'],
    backup: {
      document: backup.document,
      fileName: anonymousName(backup.document),
      replacements: backup.replacements,
      preferences: backup.preferences,
      tally: tallyPreferences(backup.preferences),
      changed: changedPreferenceCount(backup.preferences) + backup.replacements.length,
      suspects: backup.suspects,
      droppedExtras
    },
    pages: {
      document: pages.document,
      fileName: anonymousName(pages.document),
      replacements: pages.replacements,
      droppedRootKeys: pages.droppedRootKeys,
      derived: pages.previousExportType !== 'pages',
      droppedExtras,
      suspects: pages.suspects
    },
    personal
  }
}

/** Ce que le pilote a choisi, rendu à l'appelant au moment où il confirme. */
export interface SharingResult {
  /** Laquelle des trois issues. */
  form: SharingForm
  /** Vrai pour les deux issues qui remplacent : `backup` et `pages`. */
  anonymized: boolean
  /** Le nom à donner au fichier téléchargé. */
  fileName: string
  /**
   * Le document à écrire, **uniquement** pour un export anonymisé. `undefined` veut dire
   * « réémettre les octets du conteneur » : c'est ce qui tient la fidélité à l'octet près.
   */
  document?: JsonNode
  /** Le conteneur à produire. Un export anonymisé est toujours un `.xcfg` nu. */
  kind: 'xcfg' | 'xczfg'
  /** Les annexes laissées de côté. Vide pour un export ordinaire. */
  droppedExtras: readonly SharingExtra[]
}

/**
 * Les octets d'un export **anonymisé**, ou `undefined` pour un export ordinaire.
 *
 * Ce `undefined` n'est pas une commodité : c'est le contrat. L'appelant qui le reçoit
 * doit rendre ce que `exportContainer` lui donne, sans passer par le sérialiseur. Un
 * module d'interface qui réécrirait les octets d'un fichier non modifié casserait la
 * seule promesse que ce projet fait à un pilote.
 */
export function sharingBytes(result: SharingResult): Uint8Array | undefined {
  if (!result.anonymized || result.document === undefined) return undefined
  return new TextEncoder().encode(serializeJson(result.document))
}

/* ================================================================ ce qu'on dit, en mots */

/**
 * Ce que chaque section écartée emportait avec elle. Deux clés suffisent : ce sont les
 * deux seules qu'un `backup` porte en plus d'un `pages` sur les 21 fichiers du corpus
 * (`scope.ts`). Une troisième, apparue dans une version à venir, tomberait sur le repli —
 * qui la nomme sans prétendre savoir ce qu'elle contient.
 */
const DROPPED_ROOT_KEY_LABELS: Record<string, string> = {
  preferences: 'Toutes vos préférences : nom du pilote, voile, unités, thème, réglages du '
    + 'vario et de ses sons, seuils d’espaces aériens, Livetracking, capteurs Bluetooth '
    + 'appairés, fichiers de waypoints.',
  airspaceSelectedChannels: 'Les canaux d’espaces aériens que vous avez sélectionnés.'
}

export function droppedRootKeyLabel(key: string): string {
  return DROPPED_ROOT_KEY_LABELS[key]
    ?? `La section « ${key} », qu’un export « pages » ne transporte pas.`
}

/**
 * Ce que l'anonymisation coûte **au destinataire**. C'est la partie qu'on serait tenté de
 * taire, donc celle qui est écrite en toutes lettres et montrée avant le geste.
 *
 * Ce n'est pas un défaut de l'outil : c'est la conséquence directe du format. Anonymiser
 * dérive un export `pages`, et un `pages` ne porte que `info` et `layout`. Le destinataire
 * reçoit **la disposition, pas les préférences**.
 */
export const ANONYMOUS_COSTS: readonly string[] = [
  'les unités — altitudes, distances, vitesses : il gardera les siennes ;',
  'le thème d’affichage, la taille et la couleur des titres de gadgets ;',
  'les réglages du vario et de ses sons ;',
  'les seuils et les canaux d’espaces aériens ;',
  'le Livetracking et ses identifiants ;',
  'les capteurs Bluetooth appairés.'
]

/**
 * Ce que la **sauvegarde entière** coûte au destinataire, et c'est bien moins.
 *
 * Cinq lignes, et aucune n'est un réglage : ce sont des ressources de votre appareil, que
 * le destinataire n'a pas et ne pourrait pas utiliser. Tout ce qui se règle traverse — le
 * vario et ses sons, les unités, le thème, les seuils d'espaces aériens, les touches — et
 * c'est précisément à quoi sert cette issue.
 */
export const BACKUP_COSTS: readonly string[] = [
  'vos capteurs appairés : il appaire les siens, qui sont les seuls qu’il puisse utiliser ;',
  'votre tâche en cours, ses points de virage et leurs coordonnées ;',
  'vos fichiers de waypoints et d’espaces aériens, et le thème de carte que vous avez '
    + 'installé — des fichiers de votre appareil ;',
  'vos cartes hors-ligne, pour la même raison ;',
  'vos messages rapides de Livetracking, qui sont vos phrases.'
]

/**
 * Ce que la sauvegarde entière **ne** protège **pas**, dit à l'endroit où l'on pourrait le
 * croire protégé.
 *
 * `PREFERENCE_RULES` est une liste noire — l'inverse de la liste blanche `PAGES_ROOT_KEYS`
 * dont `scope.ts` tire sa solidité — et une liste noire est fausse le jour où XCTrack
 * ajoute un réglage. C'est le prix de cette issue-là, et il se dit avant le clic, pas
 * après.
 */
export const BACKUP_RESIDUAL_NOTE =
  'Cette issue traite les 44 réglages personnels connus de XCTrack et les onze champs de '
  + 'texte des gadgets. Le format change à chaque version : un réglage personnel apparu '
  + 'depuis ne serait pas dans la liste, et partirait en clair. La version partageable, '
  + 'plus bas, ne dépend d’aucune liste — elle ne transporte aucun réglage du tout.'

/** Ce que l'inventaire des soupçons annonce, avant de dérouler la liste. */
export const SUSPECTS_NOTE =
  'Ces textes ne figurent dans aucune de nos listes, et ils ressemblent pourtant à quelque '
  + 'chose que vous auriez écrit. Ils partent tels quels : nous ne remplaçons pas ce dont '
  + 'nous ne sommes pas sûrs, parce que nous abîmerions des réglages. Vous seul savez si '
  + 'vous les avez écrits.'

/** Ce qu'on dit quand rien ne ressemble à une donnée personnelle non déclarée. */
export const SUSPECTS_NONE_NOTE =
  'Aucun texte inattendu dans ce qui part : tout ce qui n’est pas traité ci-dessus a la '
  + 'forme d’un réglage — un mot choisi dans une liste, un nombre — et non celle d’un '
  + 'texte écrit.'

/** Ce qu'on écrit à la place de la valeur posée, quand la ligne entière est retirée. */
export const DROPPED_LINE = 'la ligne entière est retirée'

/**
 * Pourquoi un export anonymisé sort en `.xcfg` nu, même depuis une archive.
 *
 * ## Le piège
 *
 * Un `.xczfg` est une archive ZIP : un `.xcfg` plus des fichiers annexes ajoutés par le
 * pilote. **Rien, dans cet éditeur, n'inspecte ces annexes** — ni leur contenu, ni les
 * métadonnées d'une image, où une photo prise au décollage porte couramment les
 * coordonnées du lieu de prise de vue. Réécrire le JSON et recopier les annexes telles
 * quelles produirait un fichier dont la partie propre est propre et l'autre non : une
 * promesse d'anonymat fausse, ce qui est pire qu'une absence de promesse.
 *
 * ## Ce qui a été tranché, et pourquoi
 *
 * L'anonymisé sort en **`.xcfg` nu**, sans les annexes, plutôt que d'en proposer le
 * retrait une à une. Trois raisons, dans l'ordre où elles pèsent :
 *
 * 1. **Rien de ce qui survit ne les désigne.** Le relevé des 21 fichiers du corpus
 *    (§ « ressources extérieures » de `scope.ts`) est net : le `layout` ne référence
 *    aucun fichier ni chemin. Toutes les ressources extérieures d'une configuration sont
 *    désignées depuis les `preferences` — c'est-à-dire depuis la section que la
 *    dérivation `pages` ne transporte pas. Une annexe conservée dans l'anonymisé serait
 *    donc un fichier que plus rien n'ouvre.
 * 2. **Un choix à la carte demanderait au pilote une décision qu'il ne peut pas
 *    prendre.** « Garder cette image ? » suppose de savoir ce qu'elle porte comme
 *    métadonnées ; nous ne le lui disons pas, et lui donner la case à cocher sans le
 *    renseignement serait lui faire endosser notre ignorance.
 * 3. **Le format reste valide.** Un export `pages` écrit par XCTrack lui-même est un
 *    `.xcfg` nu : on ne fabrique donc pas une forme que l'appareil n'écrit jamais.
 *
 * Les annexes ne sont pas passées sous silence pour autant : elles sont **listées**, avec
 * leur taille, sous l'option d'anonymisation. Le pilote qui en a besoin exporte le fichier
 * complet, ou les envoie séparément en connaissance de cause.
 */
export const ANNEXES_NOTE =
  'Une archive .xczfg transporte des fichiers annexes que cet éditeur n’inspecte pas — '
  + 'ni leur contenu, ni les métadonnées d’une image, où une photo porte souvent les '
  + 'coordonnées du lieu de prise de vue. La version partageable est donc écrite en .xcfg '
  + 'nu, sans eux. Rien d’utile n’y est perdu : les ressources extérieures d’une '
  + 'configuration sont désignées depuis les préférences, qui ne partent pas non plus.'

/**
 * Ce qui reste malgré tout. Dit **à côté de l'inventaire**, jamais replié dans un volet
 * qu'on n'ouvre pas : c'est la limite exacte de ce que l'outil garantit.
 */
/**
 * Ce que la boîte promet quand **rien n'a bougé** — et c'est la promesse forte du projet.
 *
 * `exportContainer` rend alors les octets d'origine sans les réécrire (`core/container.ts`,
 * `if (!container.modified …) return container.source`). Mesuré sur les deux fixtures :
 * ouvrir puis réexporter `2026-08-20_backup-00.xcfg` et `2026-08-20_pages-00.xcfg` rend
 * des octets **identiques**, donc la même empreinte SHA-256. Le pilote peut le vérifier
 * lui-même, et c'est pour cela qu'on le lui dit.
 */
export const FIDELITY_UNCHANGED =
  'Vous n’avez rien modifié : le fichier ressort exactement tel qu’il est entré, sans une '
  + 'virgule réécrite.'

/**
 * La même chose, dite en technicien — et **repliée**.
 *
 * L'empreinte SHA-256 est la preuve vérifiable de la phrase ci-dessus, et c'est à ce
 * titre qu'elle reste dite. Mais pour qui ne sait pas ce qu'est une empreinte, elle ne
 * prouve rien : elle inquiète. Elle est donc en second rang, derrière un triangle.
 */
export const FIDELITY_UNCHANGED_DETAIL =
  'Les octets que vous avez ouverts sont réémis sans être réécrits : l’empreinte SHA-256 '
  + 'du fichier produit est celle du fichier d’origine — vous pouvez le vérifier.'

/**
 * Ce que la boîte promet quand le pilote **a modifié** son document.
 *
 * ⚠️ **La phrase précédente serait fausse ici**, et fausse au pire moment : à l'instant où
 * le pilote décide s'il ose cliquer, sur la propriété qui est l'argument central du
 * projet. Un document modifié est sérialisé, donc ses octets changent — l'empreinte aussi.
 *
 * La garantie n'est pas affaiblie pour autant, elle est **dite juste** : le sérialiseur
 * reproduit chaque littéral avec son texte source (`core/serializeJson.ts`), si bien que
 * seule la zone touchée change. Mesuré : déplacer un gadget de 100 unités en X dans
 * `2026-08-20_backup-00.xcfg` remplace une fenêtre de 48 caractères — les deux
 * coordonnées écrites — sur les 78 639 du fichier ; tout le reste sort identique, `3.0` et
 * `1.0E7` compris.
 */
export const FIDELITY_MODIFIED =
  'Tout ce que vous n’avez pas touché est recopié à l’identique — jusqu’aux nombres et à '
  + 'l’espacement d’origine. Seul ce que vous avez changé change.'

/**
 * La conséquence technique, **repliée** — et présentée pour ce qu'elle est.
 *
 * La phrase précédente ouvrait sur trois affirmations négatives d'affilée : *réécrit*,
 * *changent*, *ne sera plus*. Pour qui ne sait pas ce qu'est une empreinte SHA-256, elle
 * annonçait un dommage, à l'instant précis où le pilote décide s'il ose enregistrer. La
 * bonne nouvelle — ses modifications sont dedans — n'était jamais dite, et la garantie
 * arrivait en quatrième position.
 *
 * L'empreinte est une **garantie**, pas un aveu : elle est le seul moyen de vérifier que
 * rien d'autre n'a bougé. Elle passe donc derrière le triangle, avec sa contrepartie —
 * sur un document non modifié, elle est identique.
 */
export const FIDELITY_MODIFIED_DETAIL =
  'Le fichier étant réécrit, son empreinte SHA-256 diffère de celle du fichier d’origine ; '
  + 'sur un document non modifié, elle est identique.'

export const RESIDUAL_NOTE =
  'La liste des onze champs de texte traités est fixe, et le format de XCTrack change à '
  + 'chaque version : un champ de texte apparu depuis partirait en clair. Relisez '
  + 'l’inventaire ci-dessus avant d’envoyer le fichier — c’est lui la vérification, pas '
  + 'la promesse de cet outil.'

const ORIENTATION_LABELS: Record<string, string> = {
  landscape: 'Paysage',
  portrait: 'Portrait'
}

/**
 * L'emplacement d'un texte remplacé, dans les mots du pilote : l'orientation, le rang de
 * la page, le rang du gadget et son nom lisible.
 *
 * Le mot affiché est **gadget** — c'est celui de l'interface francophone de XCTrack, et
 * c'est celui que le reste de cette application emploie.
 */
export function describeLocation(entry: FreeTextReplacement, language: string): string {
  const orientation = ORIENTATION_LABELS[entry.orientation] ?? entry.orientation
  return `${orientation} · page ${entry.pageRank} · gadget ${entry.widgetRank}`
    + ` · ${readableName(entry.shortName, language)}`
}

/** La valeur posée, telle qu'on l'écrit quand c'est la chaîne vide. */
export function displayedReplacement(replacement: string): string {
  return replacement === '' ? '(vide)' : replacement
}

/* ============================================================================ la boîte */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export interface SharingDialogOptions {
  source: SharingSource
  /** Langue déjà résolue par l'appelant, pour nommer les gadgets. Défaut : `'fr'`. */
  language?: string
  /**
   * L'horloge. Injectable, et appelée **une seule fois**, au rendu : le nom montré est
   * exactement le nom produit. Défaut : `() => new Date()`.
   */
  now?: () => Date
  /**
   * Un bloc à insérer sous l'introduction — les avertissements d'export que `main.ts`
   * calcule déjà (`warningsAt(…, 'export')`). Ce module n'en fabrique aucun : les
   * avertissements ont leur propre chaîne, et la dupliquer les ferait diverger.
   */
  notice?: HTMLElement
  /** Appelé après la fermeture, avec ce que le pilote a choisi. */
  onConfirm: (result: SharingResult) => void
  /** Appelé après la fermeture, quand le pilote renonce — bouton, « Échap » ou « Fermer ». */
  onCancel?: () => void
}

/**
 * Ce que l'assembleur reçoit. `element` pour le poser où il veut, `open` et `close` pour
 * ne pas avoir à connaître les usages de `<dialog>`.
 */
export interface SharingDialogHandle {
  element: HTMLDialogElement
  /** Pose l'élément dans le document s'il n'y est pas, puis l'ouvre en modale. */
  open: () => void
  /** Ferme et retire l'élément. N'appelle **aucun** rappel : c'est l'appelant qui agit. */
  close: () => void
}

function replacementItem(entry: FreeTextReplacement, language: string): HTMLElement {
  const item = el('li', 'sharing__item')
  item.append(el('p', 'sharing__where', describeLocation(entry, language)))

  const swap = el('p', 'sharing__swap')
  swap.append(
    el('code', 'sharing__key', entry.keyPath),
    el('span', 'sharing__from', entry.text),
    el('span', 'sharing__arrow', '→'),
    el('span', 'sharing__to', displayedReplacement(entry.replacement))
  )
  item.append(swap, el('p', 'sharing__why', entry.reason))
  return item
}

/**
 * Ce que cette boîte **ne** compte **pas**, dit à l'endroit exact où on pourrait le
 * croire compté.
 *
 * « Aucun texte personnalisé à remplacer » se lisait « rien de personnel dans ce
 * fichier ». C'est faux d'un `backup` : les 16 clés personnelles du fichier de référence
 * sont dans les préférences, que cette boîte ne remplace pas — elle les **écarte**, en
 * dérivant un « pages ». Les deux gestes sont bons, mais ils ne portent pas sur la même
 * chose, et le pilote doit lire les deux chiffres pour le savoir.
 */
function preferencesReminder(personal: PersonalInventory): HTMLElement | undefined {
  if (personal.counts.preferences === 0) return undefined
  return el(
    'p', 'sharing__caveat',
    `Ce fichier porte par ailleurs ${plural({
      one: '{count} donnée personnelle dans ses préférences',
      other: '{count} données personnelles dans ses préférences'
    }, personal.counts.preferences)} ` +
    '— nom, matériel, capteurs appairés, tâche en cours. Elles ne sont pas remplacées : ' +
    'la version partageable ci-dessus n’emporte que les pages, et laisse en bloc toute la ' +
    'section « preferences ».'
  )
}

/**
 * L'inventaire des textes de gadgets remplacés.
 *
 * `remindPreferences` n'est vrai que pour l'issue « pages » : c'est elle qui écarte les
 * préférences en bloc sans les montrer, et « rien à remplacer » s'y lisait « rien de
 * personnel ». La sauvegarde entière, elle, montre chaque réglage personnel juste à côté :
 * répéter le rappel y serait faux, puisqu'elle les traite.
 */
function replacementsSection(
  replacements: readonly FreeTextReplacement[],
  personal: PersonalInventory,
  options: { remindPreferences: boolean; caveat: string },
  language: string
): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', 'Vos textes dans les gadgets'))

  if (replacements.length === 0) {
    section.append(el(
      'p', 'sharing__note',
      'Aucun texte personnalisé dans les gadgets de ce fichier : rien à remplacer ici.'
    ))
    const reminder = options.remindPreferences ? preferencesReminder(personal) : undefined
    if (reminder) section.append(reminder)
    section.append(el('p', 'sharing__caveat', PERSONAL_CAVEAT))
    return section
  }

  section.append(el(
    'p', 'sharing__note',
    `${plural({
      one: '{count} texte écrit par vous est remplacé',
      other: '{count} textes écrits par vous sont remplacés'
    }, replacements.length)}. Voici lesquels, et où ils se trouvent. ` +
    'Ils vivent dans la disposition des pages, et non dans les préférences : ils partent ' +
    'donc quel que soit le format du fichier.'
  ))

  const list = el('ol', 'sharing__list')
  for (const entry of replacements) list.append(replacementItem(entry, language))
  section.append(list)
  const reminder = options.remindPreferences ? preferencesReminder(personal) : undefined
  if (reminder) section.append(reminder)
  section.append(el('p', 'sharing__caveat', options.caveat))
  return section
}

/* ------------------------------------ les réglages personnels, traités ligne par ligne */

/** L'intitulé de chacun des quatre traitements, dans les mots du pilote. */
const TREATMENT_HEADINGS: Record<string, string> = {
  replace: 'Remplacés par une valeur neutre',
  drop: 'Retirés du fichier',
  keep: 'Conservés tels quels, et voici pourquoi',
  empty: 'Présents dans le fichier, mais vides'
}

/**
 * Une ligne de réglage : la clé, sa nature, ce qu'elle portait, ce qu'elle porte.
 *
 * `withReason` est faux quand tout le groupe partage la même raison — elle est alors dite
 * **une fois**, sous l'intitulé. Répéter cinq fois la même phrase ne renseigne pas
 * davantage : ça allonge une boîte qui s'ouvre à chaque enregistrement, et une boîte trop
 * longue finit par ne plus être lue du tout.
 */
function preferenceItem(outcome: PreferenceOutcome, withReason: boolean): HTMLElement {
  // Le modificateur porte le traitement : c'est lui qui décide si la valeur d'origine se
  // barre. Barrer une valeur conservée dirait le contraire de ce qui se passe.
  const item = el('li', `sharing__item sharing__item--${outcome.treatment}`)
  const swap = el('p', 'sharing__swap')
  swap.append(
    el('code', 'sharing__key', outcome.key),
    el('span', 'sharing__kind', PERSONAL_KIND_LABELS[outcome.kind])
  )

  if (outcome.treatment === 'replace' || outcome.treatment === 'drop') {
    swap.append(
      el('span', 'sharing__from', outcome.before),
      el('span', 'sharing__arrow', '→'),
      el('span', 'sharing__to', outcome.treatment === 'drop'
        ? DROPPED_LINE
        : displayedReplacement(outcome.after ?? ''))
    )
  } else {
    // Rien ne change : pas de flèche, et la valeur ne se barre pas — le style s'en charge.
    swap.append(el('span', 'sharing__from', outcome.before))
  }

  item.append(swap)
  if (withReason) item.append(el('p', 'sharing__why', outcome.reason))
  return item
}

/**
 * Ce qu'il advient de chaque réglage personnel, groupé par traitement.
 *
 * Groupé, et non dans l'ordre du fichier : la question du pilote n'est pas « qu'y a-t-il à
 * la ligne 412 » mais « qu'est-ce qui change et qu'est-ce qui reste ». Chaque groupe porte
 * son intitulé, donc son verdict, avant la liste — y compris celui qu'on serait tenté de
 * taire, « conservés tels quels ».
 */
function preferencesSection(plan: BackupPlan): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', 'Vos réglages personnels, ligne par ligne'))

  if (plan.preferences.length === 0) {
    section.append(el(
      'p', 'sharing__note',
      'Ce fichier ne porte aucun des 44 réglages que XCTrack range parmi les données ' +
      'personnelles : il n’y a rien à y traiter.'
    ))
    section.append(el('p', 'sharing__caveat', BACKUP_RESIDUAL_NOTE))
    return section
  }

  const tally = plan.tally
  section.append(el(
    'p', 'sharing__note',
    `${plural({
      one: '{count} réglage personnel a été trouvé dans ce fichier',
      other: '{count} réglages personnels ont été trouvés dans ce fichier'
    }, plan.preferences.length)} : ` +
    `${plural({
      one: '{count} remplacé', other: '{count} remplacés'
    }, tally.replaced)}, ` +
    `${plural({ one: '{count} retiré', other: '{count} retirés' }, tally.dropped)}, ` +
    `${plural({ one: '{count} conservé', other: '{count} conservés' }, tally.kept)}, ` +
    `${plural({
      one: '{count} vide', other: '{count} vides'
    }, tally.empty)}. Chaque ligne dit ce qui lui arrive et pourquoi.`
  ))

  const groups: ReadonlyArray<PreferenceOutcome['treatment']> =
    ['replace', 'drop', 'keep', 'empty']
  for (const treatment of groups) {
    const entries = plan.preferences.filter((one) => one.treatment === treatment)
    if (entries.length === 0) continue
    const group = el('div', `sharing__group sharing__group--${treatment}`)
    group.append(el('h4', 'sharing__groupHead', TREATMENT_HEADINGS[treatment] ?? treatment))

    // Une raison commune se dit une fois. Les cinq emplacements vides d'un backup réel, et
    // les quatre choix de diffusion Livetrack, portent chacun la même phrase : la répéter
    // n'ajoute rien et fait quatre écrans de défilement.
    const shared = entries.length > 1 && entries.every((one) => one.reason === entries[0]!.reason)
      ? entries[0]!.reason
      : undefined
    if (shared !== undefined) group.append(el('p', 'sharing__note', shared))

    const list = el('ul', 'sharing__list sharing__list--plain')
    for (const entry of entries) list.append(preferenceItem(entry, shared === undefined))
    group.append(list)
    section.append(group)
  }

  section.append(el('p', 'sharing__caveat', BACKUP_RESIDUAL_NOTE))
  return section
}

/* ------------------------- ce qui a l'air personnel sans être déclaré : on avertit */

/**
 * Combien de soupçons on montre avant de compter le reste.
 *
 * Le corpus n'en produit aucun sur sept fichiers, donc la borne ne sert jamais en pratique.
 * Elle existe pour le fichier qui en produirait trois cents : une liste de trois cents
 * lignes n'est plus un avertissement, c'est un mur, et un mur ne se lit pas.
 */
const SUSPECTS_SHOWN = 12

function suspectsSection(suspects: readonly PersonalSuspect[]): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', 'Ce qui a l’air d’un texte que vous auriez écrit'))

  if (suspects.length === 0) {
    section.append(el('p', 'sharing__note', SUSPECTS_NONE_NOTE))
    return section
  }

  section.append(el(
    'p', 'sharing__note',
    `${plural({
      one: '{count} texte n’est pas dans nos listes et en a pourtant l’air',
      other: '{count} textes ne sont pas dans nos listes et en ont pourtant l’air'
    }, suspects.length)}. ${SUSPECTS_NOTE}`
  ))

  const list = el('ul', 'sharing__list sharing__list--plain')
  for (const suspect of suspects.slice(0, SUSPECTS_SHOWN)) {
    const item = el('li', 'sharing__datum sharing__datum--travels')
    item.append(
      el('code', 'sharing__key', suspect.path),
      el('span', 'sharing__from', suspect.value),
      el('span', 'sharing__why', `${personalHomeLabel(suspect.home)} — ${suspect.clue}`)
    )
    list.append(item)
  }
  section.append(list)

  if (suspects.length > SUSPECTS_SHOWN) {
    section.append(el(
      'p', 'sharing__caveat',
      `${plural({
        one: '{count} autre texte du même genre n’est pas montré ici, faute de place',
        other: '{count} autres textes du même genre ne sont pas montrés ici, faute de place'
      }, suspects.length - SUSPECTS_SHOWN)}. Relisez le fichier produit avant de l’envoyer.`
    ))
  }
  return section
}

/** L'énumération de ce que le destinataire n'aura pas, sous ses deux formes. */
function costBlock(intro: string, costs: readonly string[], outro: string): HTMLElement {
  const cost = el('div', 'sharing__cost')
  cost.append(el('p', 'sharing__note', intro))
  const list = el('ul', 'sharing__list sharing__list--plain')
  for (const line of costs) list.append(el('li', 'sharing__why', line))
  cost.append(list, el('p', 'sharing__note', outro))
  return cost
}

function backupCostSection(): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', 'Ce que le destinataire n’aura pas'))
  section.append(costBlock(
    'Vos réglages traversent tous — vario et ses sons, unités, thème, seuils d’espaces '
    + 'aériens, touches. Ce qu’il n’aura pas, ce sont vos ressources à vous :',
    BACKUP_COSTS,
    'Aucune de ces lignes n’est un réglage : ce sont des fichiers et des appareils qui '
    + 'vivent chez vous, et dont il n’aurait rien pu faire.'
  ))
  return section
}

/**
 * L'inventaire complet, replié : ce que le fichier porte de personnel, où que ce soit.
 *
 * Il est ici pour que la boîte de partage cesse d'être le seul écran à ne montrer qu'une
 * moitié. Replié, parce que le geste de la boîte reste « choisir ce qu'on donne » : le
 * détail est disponible, il ne s'impose pas.
 */
function personalSection(personal: PersonalInventory): HTMLElement | undefined {
  if (personal.counts.total === 0) return undefined

  const section = el('details', 'sharing__section sharing__personal')
  const counts = personal.counts
  section.append(el('summary', 'sharing__heading',
    `Tout ce que ce fichier porte de personnel : ${String(counts.total)} — ` +
    `${String(counts.layout)} dans la disposition, ${String(counts.preferences)} dans les préférences`))

  section.append(el('p', 'sharing__note',
    `${plural({
      one: '{count} est renseignée',
      other: '{count} sont renseignées'
    }, counts.filled)}, ` +
    `${plural({
      one: '{count} est un emplacement présent mais vide',
      other: '{count} sont des emplacements présents mais vides'
    }, counts.empty)}. ` +
    'Seules celles de la disposition partent avec un export « pages ».'))

  const list = el('ul', 'sharing__list sharing__list--plain')
  for (const finding of personal.findings) {
    const item = el('li', finding.home === 'layout'
      ? 'sharing__datum sharing__datum--travels'
      : 'sharing__datum')
    item.append(
      el('code', 'sharing__key', finding.key),
      el('span', 'sharing__from', personalValueText(finding)),
      el('span', 'sharing__why', `${PERSONAL_KIND_LABELS[finding.kind]} — ${finding.reason}`)
    )
    list.append(item)
  }
  section.append(list)
  return section
}

function droppedSection(plan: PagesPlan): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', 'Ce qui ne partira pas'))

  if (plan.droppedRootKeys.length === 0) {
    section.append(el(
      'p', 'sharing__note',
      'Ce fichier est déjà un export « pages » : il ne porte aucune préférence, il n’y a '
      + 'donc rien à en retirer.'
    ))
    return section
  }

  section.append(el(
    'p', 'sharing__note',
    'Le fichier partagé est un export « pages » : il ne porte que vos pages. '
    + `${plural({
      one: 'Cette section entière reste',
      other: 'Ces sections entières restent'
    }, plan.droppedRootKeys.length)} chez vous.`
  ))

  const list = el('ul', 'sharing__list sharing__list--plain')
  for (const key of plan.droppedRootKeys) {
    const item = el('li', 'sharing__dropped')
    item.append(
      el('code', 'sharing__key', key),
      el('span', 'sharing__why', droppedRootKeyLabel(key))
    )
    list.append(item)
  }
  section.append(list)

  section.append(costBlock(
    'Ce que le destinataire n’aura donc pas, et qu’il devra régler lui-même :',
    ANONYMOUS_COSTS,
    'Il reçoit la disposition de vos pages, pas vos préférences. C’est le plus souvent ce '
    + 'qu’on veut — ses unités ne sont pas forcément les vôtres — mais il faut le savoir '
    + 'avant d’envoyer.'
  ))
  return section
}

function annexesSection(plan: { droppedExtras: readonly SharingExtra[] }): HTMLElement | undefined {
  if (plan.droppedExtras.length === 0) return undefined

  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', 'Les annexes de l’archive'))
  section.append(el('p', 'sharing__note', ANNEXES_NOTE))

  const list = el('ul', 'sharing__list sharing__list--plain')
  for (const extra of plan.droppedExtras) {
    const item = el('li', 'sharing__dropped')
    item.append(
      el('code', 'sharing__key', extra.name),
      el('span', 'sharing__why', proseFormat.byteSize(extra.byteLength))
    )
    list.append(item)
  }
  section.append(list)
  return section
}

/**
 * La boîte d'export partageable, prête à être ouverte.
 *
 * Elle reprend le meuble déjà posé : `<dialog class="modal">`, tête collante
 * (`.modal__head`) dont le bouton de fermeture reste atteignable quand la boîte défile —
 * un acquis récent, et un inventaire de remplacements peut être long. La seule feuille
 * ajoutée est `sharingDialog.css`, importée par ce module.
 *
 * **Rendre la boîte juste avant de l'ouvrir** : l'horodatage du nom est celui du rendu,
 * pas celui du clic. C'est ce qui fait que le nom montré est exactement le nom produit.
 */
export function renderSharingDialog(options: SharingDialogOptions): SharingDialogHandle {
  const language = options.language ?? 'fr'
  const when = (options.now ?? (() => new Date()))()
  const plan = planSharing(options.source, when)

  const dialog = el('dialog', 'modal modal--sharing')
  dialog.setAttribute('aria-label', 'Enregistrer cette configuration')

  const box = el('div', 'modal__box')

  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', 'Enregistrer cette configuration'))
  const dismiss = el('button', 'btn btn--ghost', 'Fermer')
  dismiss.type = 'button'
  head.append(dismiss)
  box.append(head)

  box.append(el(
    'p', 'modal__lead',
    'Le fichier produit porte un nom horodaté qui ne reprend rien du nom d’origine — '
    + 'celui-ci contient souvent un prénom. Le nom est donc réglé ; reste à choisir ce '
    + 'que le fichier contient.'
  ))
  if (options.notice) box.append(options.notice)

  /* --- les trois issues, chacune suivie de son inventaire --- */

  const choices = el('fieldset', 'sharing__choices')
  const legend = el('legend', 'sr-only')
  legend.textContent = 'Que faut-il enregistrer ?'
  choices.append(legend)

  const name = `sharing-choice-${Math.random().toString(36).slice(2, 8)}`
  const inputs: Array<{ form: SharingForm; input: HTMLInputElement }> = []
  const panels: Array<{ form: SharingForm; panel: HTMLElement }> = []

  /**
   * Une carte de choix, et le volet qui la suit.
   *
   * Le volet est posé **entre les cartes**, pas au bas de la boîte : avec trois issues, un
   * inventaire unique en pied de page obligerait à faire l'aller-retour entre le choix et
   * sa conséquence. Il est en revanche **hors de l'étiquette** — un `<label>` qui
   * contiendrait la liste rendrait chaque clic dedans un clic sur le bouton radio.
   */
  const buildChoice = (
    form: SharingForm, title: string, note: string, checked: boolean,
    detail?: string
  ): HTMLElement => {
    const label = el('label', 'sharing__choice')
    const input = el('input', 'sharing__radio')
    input.type = 'radio'
    input.name = name
    input.value = form
    input.checked = checked
    // La carte entière est l'étiquette (voir le commentaire CSS de `.sharing__choice`) :
    // sans ce nom explicite, le « Pour les curieux » imbriqué se lirait à chaque passage
    // sur ce bouton radio — et son détail technique une fois déplié. Un nom posé ici
    // l'emporte sur celui que le navigateur aurait tiré du contenu de l'étiquette.
    input.setAttribute('aria-label', `${title}. ${note}`)
    const body = el('span', 'sharing__choiceBody')
    body.append(
      el('span', 'sharing__choiceTitle', title),
      el('span', 'sharing__choiceNote', note)
    )
    if (detail !== undefined) {
      const curious = el('details', 'sharing__curious')
      curious.append(el('summary', 'sharing__curiousHead', 'Pour les curieux'))
      curious.append(el('span', 'sharing__choiceNote', detail))
      body.append(curious)
    }
    label.append(input, body)
    choices.append(label)
    inputs.push({ form, input })

    // La classe porte l'issue : la feuille et les tests désignent alors un volet précis,
    // au lieu de compter sur son rang. Celui de `plain` reste vide — il n'y a rien à
    // annoncer quand rien ne change — et une grille sans enfant n'occupe aucune place.
    const panel = el('div', `sharing__detail sharing__detail--${form}`)
    choices.append(panel)
    panels.push({ form, panel })
    return panel
  }

  const counts = plan.personal.counts
  const contentNote = plan.exportType === 'pages'
    ? ' Un export « pages » ne porte pas de préférences, mais les textes que vous avez '
      + 'écrits dans les gadgets, si.'
    : ' Il porte vos préférences : nom du pilote, voile, capteurs appairés, fichiers de '
      + 'waypoints.'
  const plainNote = (plan.modified ? FIDELITY_MODIFIED : FIDELITY_UNCHANGED) + contentNote
  const plainDetail = plan.modified ? FIDELITY_MODIFIED_DETAIL : FIDELITY_UNCHANGED_DETAIL

  // Les deux chiffres, nommés, et jamais additionnés : ils ne répondent pas à la même
  // question. Celui de la disposition est le seul qui survive à un export « pages ».
  const tally = counts.total === 0
    ? ''
    : ` Il porte ${plural({
      one: '{count} donnée personnelle dans la disposition',
      other: '{count} données personnelles dans la disposition'
    }, counts.layout)} et ${plural({
      one: '{count} dans les préférences',
      other: '{count} dans les préférences'
    }, counts.preferences)} ; toutes partiraient en clair.`

  // « Fichier complet » n'était juste pour aucun des deux formats : un export « pages »
  // n'a rien de complet, il ne porte pas les préférences. Ce que le mot opposait en
  // réalité, c'est « tel qu'il est » à « expurgé ».
  buildChoice(
    'plain', 'Votre configuration, telle qu’elle est', `${plainNote}${tally}`, true, plainDetail
  )

  const offers = (form: SharingForm): boolean => plan.forms.includes(form)

  // Le chiffre est dans la carte, avant le volet : c'est ce qui permet de choisir sans
  // dérouler l'inventaire, et l'inventaire reste là pour qui veut vérifier.
  const backupNote = plan.backup.changed === 0
    ? 'Le fichier reste une sauvegarde entière — vario et ses sons, unités, thème, seuils '
      + 'd’espaces aériens, touches. Ce fichier-ci ne porte rien qui vous désigne : il n’y '
      + 'a donc rien à y remplacer.'
    : 'Le fichier reste une sauvegarde entière — vario et ses sons, unités, thème, seuils '
      + 'd’espaces aériens, touches. '
      + `${plural({
        one: '{count} ligne qui vous désigne est remplacée par une valeur neutre ou retirée',
        other: '{count} lignes qui vous désignent sont remplacées par des valeurs neutres '
          + 'ou retirées'
      }, plan.backup.changed)}.`

  const backupPanel = offers('backup')
    ? buildChoice('backup', 'Tous vos réglages, sans ce qui vous désigne', backupNote, false)
    : undefined

  const pagesPanel = buildChoice(
    'pages',
    'Version partageable, sans données personnelles',
    'Un export « pages » dont les textes que vous avez écrits sont remplacés par des '
    + 'textes neutres. La disposition est conservée ; les préférences ne partent pas.',
    false
  )

  box.append(choices)

  /* --- ce que chaque issue fait, montré avant de le faire --- */

  if (backupPanel !== undefined) {
    backupPanel.append(preferencesSection(plan.backup))
    backupPanel.append(replacementsSection(
      plan.backup.replacements, plan.personal,
      { remindPreferences: false, caveat: RESIDUAL_NOTE }, language
    ))
    backupPanel.append(backupCostSection())
    const backupAnnexes = annexesSection(plan.backup)
    if (backupAnnexes) backupPanel.append(backupAnnexes)
    backupPanel.append(suspectsSection(plan.backup.suspects))
  }

  pagesPanel.append(droppedSection(plan.pages))
  const pagesAnnexes = annexesSection(plan.pages)
  if (pagesAnnexes) pagesPanel.append(pagesAnnexes)
  pagesPanel.append(replacementsSection(
    plan.pages.replacements, plan.personal,
    { remindPreferences: true, caveat: RESIDUAL_NOTE }, language
  ))
  pagesPanel.append(suspectsSection(plan.pages.suspects))

  const inventory = personalSection(plan.personal)
  if (inventory) box.append(inventory)

  /* --- le nom produit --- */

  const fileNameLine = el('p', 'modal__name')
  box.append(fileNameLine)

  const chosenForm = (): SharingForm =>
    inputs.find((one) => one.input.checked)?.form ?? 'plain'

  const FILE_NAMES: Record<SharingForm, () => string> = {
    plain: () => plan.plainFileName,
    backup: () => plan.backup.fileName,
    pages: () => plan.pages.fileName
  }

  const refresh = (): void => {
    const form = chosenForm()
    for (const one of panels) one.panel.hidden = one.form !== form
    fileNameLine.textContent = `Nom du fichier produit : ${FILE_NAMES[form]()}`
  }
  for (const one of inputs) one.input.addEventListener('change', refresh)
  refresh()

  /* --- confirmer ou renoncer --- */

  const actions = el('div', 'modal__actions')
  const cancel = el('button', 'btn', 'Annuler')
  cancel.type = 'button'
  const confirm = el('button', 'btn btn--primary', 'Enregistrer')
  confirm.type = 'button'
  actions.append(cancel, confirm)
  box.append(actions)

  dialog.append(box)

  const handle: SharingDialogHandle = {
    element: dialog,
    open: () => {
      if (!dialog.isConnected) document.body.append(dialog)
      dialog.showModal()
      // Jamais le bouton « Enregistrer » : cette boîte choisit ce qu'il advient de données
      // personnelles, et l'option cochée à l'ouverture est celle qui les emporte toutes. Un
      // clavier qui presse Entrée par réflexe juste après l'ouverture ne doit pas exporter
      // avant d'avoir vu le choix. Le premier bouton radio est déjà celui coché — et il
      // l'est d'autant plus qu'il y a maintenant trois issues à parcourir.
      inputs[0]?.input.focus()
    },
    close: () => {
      if (dialog.open) dialog.close()
      dialog.remove()
    }
  }

  const giveUp = (): void => {
    handle.close()
    options.onCancel?.()
  }
  cancel.addEventListener('click', giveUp)
  dismiss.addEventListener('click', giveUp)
  // « Échap » ferme la boîte native : rien n'est enregistré, comme « Annuler ».
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    giveUp()
  })

  confirm.addEventListener('click', () => {
    const form = chosenForm()
    handle.close()
    if (form !== 'plain') {
      const chosen = form === 'backup' ? plan.backup : plan.pages
      options.onConfirm({
        form,
        anonymized: true,
        fileName: chosen.fileName,
        document: chosen.document,
        // Toujours un `.xcfg` nu, archive ou non — voir `ANNEXES_NOTE`. La raison vaut
        // pour les deux issues anonymisantes : les annexes ne sont pas inspectées.
        kind: 'xcfg',
        droppedExtras: chosen.droppedExtras
      })
      return
    }
    options.onConfirm({
      form: 'plain',
      anonymized: false,
      fileName: plan.plainFileName,
      // Pas de document : l'appelant réémet les octets du conteneur, inchangés.
      kind: options.source.kind,
      droppedExtras: []
    })
  })

  return handle
}
