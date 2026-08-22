import './sharingDialog.css'
import { pageClassLabel, readableName } from '../catalog/widgetNames'
import type { JsonNode } from '../core/jsonDocument'
import { serializeJson } from '../core/serializeJson'
import { readLayout } from '../model/layout'
import { allPageRefs, type PageRef, type PageSelection } from '../model/scope'
import {
  anonymizeBackup,
  anonymizeDocument,
  buildExportFileName,
  carriesPreferences,
  changedPreferenceCount,
  documentExportType,
  sharingProse,
  tallyPreferences,
  type FreeTextReplacement,
  type PersonalSuspect,
  type PreferenceOutcome,
  type PreferenceTally,
  type SharingProse
} from '../model/sharing'
import {
  collectPersonalData,
  personalProse,
  type PersonalInventory,
  type PersonalProse
} from '../model/personalData'
import type { Translator } from '../i18n'

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
  /** Les pages effectivement emportées, dans l'ordre du fichier. */
  keptPages: PageRef[]
  /** Les pages restées chez le pilote. Vide quand tout part. */
  droppedPages: PageRef[]
  /** Combien de pages le fichier ouvert porte, toutes orientations confondues. */
  totalPages: number
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
/**
 * Une page qu'on peut décider d'envoyer ou de garder, avec de quoi la reconnaître.
 *
 * Une page ne porte **ni nom ni identifiant** — mesuré sur les 21 fichiers du corpus :
 * `CLASS`, `navigations`, `widgets`, et rien d'autre. Ce qui la désigne au pilote est
 * donc son orientation, son rang, son type, et ce qu'elle porte. Le rang est aussi sa
 * place dans le défilement de l'instrument.
 */
export interface PageOffer {
  ref: PageRef
  /** Le nom court de la classe de page — `WPEmpty`. Suit l'axe `labels`, pas notre prose. */
  shortName: string
  widgetCount: number
  /** Combien de textes écrits par le pilote partiraient avec cette page. */
  personalCount: number
}

/**
 * Les pages du fichier ouvert, dans l'ordre où il les écrit, prêtes à être cochées.
 *
 * Le compte de textes personnels vient de `collectPersonalData` — le **même** inventaire
 * que la boîte affiche par ailleurs, filtré par page. Deux chiffres calculés séparément
 * finiraient par se contredire ; celui-ci ne le peut pas.
 */
export function offeredPages(document: JsonNode, personal: PersonalInventory): PageOffer[] {
  const layout = readLayout(document)
  return allPageRefs(layout).map((ref) => {
    const page = layout[ref.orientation][ref.rank - 1]
    return {
      ref,
      shortName: page === undefined
        ? ''
        : (page.className.split('.').pop() ?? page.className),
      widgetCount: page?.widgets.length ?? 0,
      personalCount: personal.findings.filter((finding) =>
        finding.home === 'layout' && finding.filled &&
        finding.location?.orientation === ref.orientation &&
        finding.location.pageRank === ref.rank
      ).length
    }
  })
}

/**
 * L'issue « pages », recalculée pour une sélection donnée.
 *
 * Séparée de `planSharing` parce qu'elle seule dépend de ce que le pilote coche : la boîte
 * la rappelle à chaque case cochée, et le document qu'elle rend est **celui qui sera
 * écrit**. L'inventaire montré et le fichier produit sortent donc du même appel — la règle
 * « on annonce avant de changer » ne tient qu'à ce prix.
 */
export function planPages(
  source: SharingSource, when: Date, selection?: PageSelection
): PagesPlan {
  const pages = anonymizeDocument(source.document, selection)
  const total = allPageRefs(readLayout(source.document))
  const dropped = new Set(pages.droppedPages.map((ref) => `${ref.orientation}:${ref.rank}`))
  return {
    document: pages.document,
    fileName: buildExportFileName({
      when,
      exportType: documentExportType(pages.document),
      anonymized: true
    }),
    replacements: pages.replacements,
    droppedRootKeys: pages.droppedRootKeys,
    derived: pages.previousExportType !== 'pages',
    droppedExtras: source.kind === 'xczfg' ? (source.extras ?? []) : [],
    suspects: pages.suspects,
    keptPages: total.filter((ref) => !dropped.has(`${ref.orientation}:${ref.rank}`)),
    droppedPages: pages.droppedPages,
    totalPages: total.length
  }
}

export function planSharing(source: SharingSource, when: Date): SharingPlan {
  const exportType = documentExportType(source.document)
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
    pages: planPages(source, when),
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
const DROPPED_ROOT_KEY_MESSAGES: Record<string, 'sharing.droppedPreferences' | 'sharing.droppedAirspaceChannels'> = {
  preferences: 'sharing.droppedPreferences',
  airspaceSelectedChannels: 'sharing.droppedAirspaceChannels'
}

export function droppedRootKeyLabel(key: string, tr: Translator): string {
  const known = DROPPED_ROOT_KEY_MESSAGES[key]
  // La clé du fichier est un identifiant : elle se recopie telle quelle dans le repli.
  return known === undefined ? tr.t('sharing.droppedUnknownSection', { key }) : tr.t(known)
}

/**
 * Ce que l'anonymisation coûte **au destinataire**. C'est la partie qu'on serait tenté de
 * taire, donc celle qui est écrite en toutes lettres et montrée avant le geste.
 *
 * Ce n'est pas un défaut de l'outil : c'est la conséquence directe du format. Anonymiser
 * dérive un export `pages`, et un `pages` ne porte que `info` et `layout`. Le destinataire
 * reçoit **la disposition, pas les préférences**.
 */
export function anonymousCosts(tr: Translator): readonly string[] {
  return [
    tr.t('sharing.anonymousCostUnits'),
    tr.t('sharing.anonymousCostTheme'),
    tr.t('sharing.anonymousCostVario'),
    tr.t('sharing.anonymousCostAirspace'),
    tr.t('sharing.anonymousCostLivetracking'),
    tr.t('sharing.anonymousCostSensors')
  ]
}

/**
 * Ce que la **sauvegarde entière** coûte au destinataire, et c'est bien moins.
 *
 * Cinq lignes, et aucune n'est un réglage : ce sont des ressources de votre appareil, que
 * le destinataire n'a pas et ne pourrait pas utiliser. Tout ce qui se règle traverse — le
 * vario et ses sons, les unités, le thème, les seuils d'espaces aériens, les touches — et
 * c'est précisément à quoi sert cette issue.
 */
export function backupCosts(tr: Translator): readonly string[] {
  return [
    tr.t('sharing.backupCostSensors'),
    tr.t('sharing.backupCostTask'),
    tr.t('sharing.backupCostFiles'),
    tr.t('sharing.backupCostOfflineMaps'),
    tr.t('sharing.backupCostQuickMessages')
  ]
}

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
 *
 * La phrase elle-même est `sharing.annexesNote`.
 */

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
export const FIDELITY_UNCHANGED = 'sharing.fidelityUnchanged' as const

/**
 * La même chose, dite en technicien — et **repliée**.
 *
 * L'empreinte SHA-256 est la preuve vérifiable de la phrase ci-dessus, et c'est à ce
 * titre qu'elle reste dite. Mais pour qui ne sait pas ce qu'est une empreinte, elle ne
 * prouve rien : elle inquiète. Elle est donc en second rang, derrière un triangle.
 */
export const FIDELITY_UNCHANGED_DETAIL = 'sharing.fidelityUnchangedDetail' as const

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
export const FIDELITY_MODIFIED = 'sharing.fidelityModified' as const

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
export const FIDELITY_MODIFIED_DETAIL = 'sharing.fidelityModifiedDetail' as const

/**
 * L'orientation dans les mots du pilote. Elle vit dans le domaine `sharing` plutôt que
 * dans `common.ts` : elle ne sert qu'ici et dans `warnings.ts`, et un mot n'entre dans le
 * vocabulaire partagé que lorsque **deux domaines** l'emploient.
 *
 * Une orientation inconnue se recopie telle quelle : c'est un identifiant lu dans le
 * fichier, et l'inventer serait pire que le montrer.
 */
function orientationLabel(orientation: string, tr: Translator): string {
  if (orientation === 'landscape') return tr.t('sharing.orientationLandscape')
  if (orientation === 'portrait') return tr.t('sharing.orientationPortrait')
  return orientation
}

/**
 * L'emplacement d'un texte remplacé, dans les mots du pilote : l'orientation, le rang de
 * la page, le rang du gadget et son nom lisible.
 *
 * Le mot affiché est **gadget** en français — c'est celui de l'interface francophone de
 * XCTrack — et *widget* dans les quatre autres langues. C'est le message qui le porte,
 * pas ce code : voir `sharing.location`.
 */
export function describeLocation(
  entry: FreeTextReplacement, language: string, tr: Translator
): string {
  return tr.t('sharing.location', {
    orientation: orientationLabel(entry.orientation, tr),
    page: entry.pageRank,
    rank: entry.widgetRank,
    name: readableName(entry.shortName, language)
  })
}

/** La valeur posée, telle qu'on l'écrit quand c'est la chaîne vide. */
export function displayedReplacement(replacement: string, tr: Translator): string {
  return replacement === '' ? tr.t('sharing.emptyValue') : replacement
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
  /**
   * Notre prose, dans la langue du pilote. **Passé, jamais lu.**
   *
   * ⚠️ C'est l'**autre** axe que `language` ci-dessous : celui-ci suit le choix du pilote,
   * celui-là suit le fichier ouvert et nomme les gadgets. Voir `src/i18n/axes.ts`.
   */
  tr: Translator
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

function replacementItem(
  entry: FreeTextReplacement, language: string, tr: Translator, why: SharingProse
): HTMLElement {
  const item = el('li', 'sharing__item')
  item.append(el('p', 'sharing__where', describeLocation(entry, language, tr)))

  const swap = el('p', 'sharing__swap')
  swap.append(
    el('code', 'sharing__key', entry.keyPath),
    el('span', 'sharing__from', entry.text),
    el('span', 'sharing__arrow', '→'),
    el('span', 'sharing__to', displayedReplacement(entry.replacement, tr))
  )
  // `entry.reasonKey` vient de `model/sharing.ts` : c'est la prose du domaine `model`, et
  // ce module ne fait que l'afficher, dans la langue du pilote.
  item.append(swap, el('p', 'sharing__why', why.reason(entry)))
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
function preferencesReminder(
  personal: PersonalInventory, tr: Translator
): HTMLElement | undefined {
  if (personal.counts.preferences === 0) return undefined
  return el('p', 'sharing__caveat', tr.t('sharing.otherPersonalInPreferences', {
    count: personal.counts.preferences
  }))
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
  language: string,
  tr: Translator,
  prose: PersonalProse,
  why: SharingProse
): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', tr.t('sharing.freeTextHeading')))

  if (replacements.length === 0) {
    section.append(el('p', 'sharing__note', tr.t('sharing.freeTextNone')))
    const reminder = options.remindPreferences
      ? preferencesReminder(personal, tr)
      : undefined
    if (reminder) section.append(reminder)
    section.append(el('p', 'sharing__caveat', prose.caveat()))
    return section
  }

  section.append(el(
    'p', 'sharing__note',
    tr.t('sharing.freeTextCount', { count: replacements.length })
  ))

  const list = el('ol', 'sharing__list')
  for (const entry of replacements) list.append(replacementItem(entry, language, tr, why))
  section.append(list)
  const reminder = options.remindPreferences ? preferencesReminder(personal, tr) : undefined
  if (reminder) section.append(reminder)
  section.append(el('p', 'sharing__caveat', options.caveat))
  return section
}

/* ------------------------------------ les réglages personnels, traités ligne par ligne */

/**
 * L'intitulé de chacun des quatre traitements, dans les mots du pilote.
 *
 * **`keep` est le refus assumé**, et il s'affiche aussi visiblement que les trois autres :
 * un booléen de diffusion Livetrack ou une catégorie de voile est un **réglage**, pas une
 * donnée, et c'est souvent de lui qu'on vient parler sur un forum. Le taire ferait passer
 * une décision pour une négligence.
 */
const TREATMENT_HEADINGS = {
  replace: 'sharing.treatmentReplace',
  drop: 'sharing.treatmentDrop',
  keep: 'sharing.treatmentKeep',
  empty: 'sharing.treatmentEmpty'
} as const

/**
 * Une ligne de réglage : la clé, sa nature, ce qu'elle portait, ce qu'elle porte.
 *
 * `withReason` est faux quand tout le groupe partage la même raison — elle est alors dite
 * **une fois**, sous l'intitulé. Répéter cinq fois la même phrase ne renseigne pas
 * davantage : ça allonge une boîte qui s'ouvre à chaque enregistrement, et une boîte trop
 * longue finit par ne plus être lue du tout.
 */
function preferenceItem(
  outcome: PreferenceOutcome, withReason: boolean, tr: Translator, prose: PersonalProse,
  why: SharingProse
): HTMLElement {
  // Le modificateur porte le traitement : c'est lui qui décide si la valeur d'origine se
  // barre. Barrer une valeur conservée dirait le contraire de ce qui se passe.
  const item = el('li', `sharing__item sharing__item--${outcome.treatment}`)
  const swap = el('p', 'sharing__swap')
  swap.append(
    el('code', 'sharing__key', outcome.key),
    el('span', 'sharing__kind', prose.kind(outcome.kind))
  )

  if (outcome.treatment === 'replace' || outcome.treatment === 'drop') {
    swap.append(
      el('span', 'sharing__from', prose.value(outcome.before)),
      el('span', 'sharing__arrow', '→'),
      el('span', 'sharing__to', outcome.treatment === 'drop'
        ? tr.t('sharing.droppedLine')
        : displayedReplacement(outcome.after ?? '', tr))
    )
  } else {
    // Rien ne change : pas de flèche, et la valeur ne se barre pas — le style s'en charge.
    swap.append(el('span', 'sharing__from', prose.value(outcome.before)))
  }

  item.append(swap)
  if (withReason) item.append(el('p', 'sharing__why', why.reason(outcome)))
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
function preferencesSection(
  plan: BackupPlan, tr: Translator, prose: PersonalProse, why: SharingProse
): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', tr.t('sharing.preferencesHeading')))

  if (plan.preferences.length === 0) {
    section.append(el('p', 'sharing__note', tr.t('sharing.preferencesNone')))
    section.append(el('p', 'sharing__caveat', tr.t('sharing.backupResidualNote')))
    return section
  }

  // Les quatre chiffres se joignent par `', '` et non par `format.list` : c'est une
  // **colonne de données**, pas une énumération dans une phrase — « 3 remplacés, 4 retirés
  // et 4 conservés » ferait lire une prose là où il y a un tableau.
  const tally = plan.tally
  section.append(el('p', 'sharing__note', tr.t('sharing.preferencesFound', {
    count: plan.preferences.length,
    tally: [
      tr.t('sharing.preferencesReplaced', { count: tally.replaced }),
      tr.t('sharing.preferencesDropped', { count: tally.dropped }),
      tr.t('sharing.preferencesKept', { count: tally.kept }),
      tr.t('sharing.preferencesEmpty', { count: tally.empty })
    ].join(', ')
  })))

  const groups: ReadonlyArray<PreferenceOutcome['treatment']> =
    ['replace', 'drop', 'keep', 'empty']
  for (const treatment of groups) {
    const entries = plan.preferences.filter((one) => one.treatment === treatment)
    if (entries.length === 0) continue
    const group = el('div', `sharing__group sharing__group--${treatment}`)
    group.append(el('h4', 'sharing__groupHead', tr.t(TREATMENT_HEADINGS[treatment])))

    // Une raison commune se dit une fois. Les cinq emplacements vides d'un backup réel, et
    // les quatre choix de diffusion Livetrack, portent chacun la même phrase : la répéter
    // n'ajoute rien et fait quatre écrans de défilement.
    // La comparaison porte sur la **clé**, non sur la phrase : c'est ce qui fait qu'une
    // raison partagée par dix-sept réglages reste une seule clé, donc un seul paragraphe.
    const first = entries[0]!
    const shared = entries.length > 1 && entries.every((one) => one.reasonKey === first.reasonKey)
      ? why.reason(first)
      : undefined
    if (shared !== undefined) group.append(el('p', 'sharing__note', shared))

    const list = el('ul', 'sharing__list sharing__list--plain')
    for (const entry of entries) {
      list.append(preferenceItem(entry, shared === undefined, tr, prose, why))
    }
    group.append(list)
    section.append(group)
  }

  section.append(el('p', 'sharing__caveat', tr.t('sharing.backupResidualNote')))
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

function suspectsSection(
  suspects: readonly PersonalSuspect[], tr: Translator, prose: PersonalProse,
  why: SharingProse
): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', tr.t('sharing.suspectsHeading')))

  if (suspects.length === 0) {
    section.append(el('p', 'sharing__note', tr.t('sharing.suspectsNoneNote')))
    return section
  }

  section.append(el(
    'p', 'sharing__note',
    `${tr.t('sharing.suspectsCount', { count: suspects.length })} ${tr.t('sharing.suspectsNote')}`
  ))

  const list = el('ul', 'sharing__list sharing__list--plain')
  for (const suspect of suspects.slice(0, SUSPECTS_SHOWN)) {
    const item = el('li', 'sharing__datum sharing__datum--travels')
    item.append(
      el('code', 'sharing__key', suspect.path),
      el('span', 'sharing__from', suspect.value),
      // `suspect.clueKey` désigne l'un des sept indices de `model/sharing.ts` : prose du
      // domaine `model`, affichée ici sans être réécrite.
      el('span', 'sharing__why', `${prose.home(suspect.home)} — ${why.clue(suspect)}`)
    )
    list.append(item)
  }
  section.append(list)

  if (suspects.length > SUSPECTS_SHOWN) {
    section.append(el('p', 'sharing__caveat', tr.t('sharing.suspectsMore', {
      count: suspects.length - SUSPECTS_SHOWN
    })))
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

function backupCostSection(tr: Translator): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', tr.t('sharing.backupCostHeading')))
  section.append(costBlock(
    tr.t('sharing.backupCostIntro'),
    backupCosts(tr),
    tr.t('sharing.backupCostOutro')
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
function personalSection(
  personal: PersonalInventory, tr: Translator, prose: PersonalProse
): HTMLElement | undefined {
  if (personal.counts.total === 0) return undefined

  const section = el('details', 'sharing__section sharing__personal')
  const counts = personal.counts
  section.append(el('summary', 'sharing__heading', tr.t('sharing.personalHeading', {
    total: counts.total,
    layout: counts.layout,
    preferences: counts.preferences
  })))

  section.append(el('p', 'sharing__note',
    `${tr.t('sharing.personalFilled', { count: counts.filled })}, ` +
    `${tr.t('sharing.personalEmpty', { count: counts.empty })}. ` +
    tr.t('sharing.personalTravelsNote')))

  const list = el('ul', 'sharing__list sharing__list--plain')
  for (const finding of personal.findings) {
    const item = el('li', finding.home === 'layout'
      ? 'sharing__datum sharing__datum--travels'
      : 'sharing__datum')
    item.append(
      el('code', 'sharing__key', finding.key),
      el('span', 'sharing__from', prose.value(finding)),
      el('span', 'sharing__why', `${prose.kind(finding.kind)} — ${prose.reason(finding)}`)
    )
    list.append(item)
  }
  section.append(list)
  return section
}

/* ------------------------------------------- n'envoyer que certaines pages, et le dire */

/**
 * La désignation d'une page dans les mots du pilote : l'orientation, le rang, le type de
 * page et ce qu'elle porte.
 *
 * Le **type** suit l'axe `labels` — c'est un mot de XCTrack, il vient du catalogue extrait
 * de l'APK et suit la langue du fichier ouvert, jamais celle de notre interface.
 */
function pageOfferLabel(
  offer: PageOffer, language: string, tr: Translator
): string {
  const line = tr.t('sharing.pagesChoiceLine', {
    // Le rang est un rang lu dans le fichier, pas une quantité : il se passe en `string`
    // pour qu'aucune langue ne le mette en forme — « 1 000 » ne désigne aucune page.
    rank: String(offer.ref.rank),
    orientation: orientationLabel(offer.ref.orientation, tr),
    kind: pageClassLabel(offer.shortName, language),
    parts: tr.t('common.widgetCount', { count: offer.widgetCount })
  })
  return offer.personalCount === 0
    ? line
    : `${line} · ${tr.t('sharing.pagesChoicePersonal', { count: offer.personalCount })}`
}

/**
 * **Ce que le destinataire obtiendra vraiment** — la section qui décide si ce geste est un
 * cadeau ou un dégât.
 *
 * Elle existe parce que le réflexe est faux. Un pilote qui reçoit des pages coche
 * naturellement « Remplacer les pages uniquement », et ce bouton-là **remplace la totalité
 * de son jeu de pages, dans les deux orientations** : mesuré sur un AIR³ 7.2 les 21 et
 * 22 août 2026, l'appareil se retrouve avec le nombre de pages du fichier — 5 devenues 6,
 * 3 devenues 4. Recevoir une page seule ainsi, c'est perdre les siennes.
 *
 * L'instrument offre pourtant l'issue qu'il faut, et personne ne la nomme : **« Ajouter
 * des pages uniquement »** pose les pages reçues **à la suite** de celles de l'appareil,
 * sans en toucher aucune — mesuré le 22 août 2026, neuf pages ajoutées après cinq, aucun
 * fichier existant modifié. C'est cette phrase-là qui rend le geste offrable, et elle
 * s'affiche **avant** le téléchargement, avec le fichier qu'elle décrit.
 *
 * ⚠️ **Ce qui n'est pas mesuré est dit comme tel.** Aucun fichier d'une seule page n'a
 * jamais été importé sur un instrument, ni aucun fichier dont une orientation porte un
 * tableau vide. Ce que l'appareil en fait se **déduit** des deux mesures ci-dessus ; le
 * projet n'a pas le droit de l'affirmer.
 *
 * ⚠️ **La fusion mesurée sur « Remplacer tout » ne s'étend pas aux pages.** Un import de
 * sauvegarde complète n'a changé que 3 préférences sur 136 : une ligne absente du fichier
 * garde sa valeur sur l'appareil. C'est vrai des **réglages**, et le croire vrai des pages
 * serait la faute que ce projet redoute le plus — une mesure exacte étendue à un ensemble
 * qu'elle ne couvre pas. Les pages, elles, sont remplacées en bloc.
 */
function pagesImportSection(plan: PagesPlan, tr: Translator): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', tr.t('sharing.pagesImportHeading')))
  section.append(el('p', 'sharing__note', tr.t('sharing.pagesImportAdd')))
  section.append(el('p', 'sharing__note', tr.t('sharing.pagesImportReplace')))
  section.append(el('p', 'sharing__note', tr.t('sharing.pagesImportLocked')))
  if (plan.droppedPages.length > 0) {
    section.append(el('p', 'sharing__caveat', tr.t('sharing.pagesImportUnmeasured')))
  }
  section.append(el('p', 'sharing__caveat', tr.t('sharing.pagesCarry')))
  return section
}

function droppedSection(plan: PagesPlan, tr: Translator): HTMLElement {
  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', tr.t('sharing.droppedHeading')))

  if (plan.droppedRootKeys.length === 0) {
    section.append(el('p', 'sharing__note', tr.t('sharing.droppedNothing')))
    return section
  }

  section.append(el('p', 'sharing__note', tr.t('sharing.droppedIntro', {
    count: plan.droppedRootKeys.length
  })))

  const list = el('ul', 'sharing__list sharing__list--plain')
  for (const key of plan.droppedRootKeys) {
    const item = el('li', 'sharing__dropped')
    item.append(
      el('code', 'sharing__key', key),
      el('span', 'sharing__why', droppedRootKeyLabel(key, tr))
    )
    list.append(item)
  }
  section.append(list)

  section.append(costBlock(
    tr.t('sharing.anonymousCostIntro'),
    anonymousCosts(tr),
    tr.t('sharing.anonymousCostOutro')
  ))
  return section
}

function annexesSection(
  plan: { droppedExtras: readonly SharingExtra[] }, tr: Translator
): HTMLElement | undefined {
  if (plan.droppedExtras.length === 0) return undefined

  const section = el('section', 'sharing__section')
  section.append(el('h3', 'sharing__heading', tr.t('sharing.annexesHeading')))
  section.append(el('p', 'sharing__note', tr.t('sharing.annexesNote')))

  const list = el('ul', 'sharing__list sharing__list--plain')
  for (const extra of plan.droppedExtras) {
    const item = el('li', 'sharing__dropped')
    item.append(
      el('code', 'sharing__key', extra.name),
      // La taille se met en forme dans la langue du pilote : « 1,4 Mo », « 1.4 MB ».
      el('span', 'sharing__why', tr.format.byteSize(extra.byteLength))
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
  const tr = options.tr
  const prose = personalProse(tr)
  const why = sharingProse(tr)
  const language = options.language ?? 'fr'
  const when = (options.now ?? (() => new Date()))()
  const plan = planSharing(options.source, when)

  const dialog = el('dialog', 'modal modal--sharing')
  dialog.setAttribute('aria-label', tr.t('sharing.dialogTitle'))

  const box = el('div', 'modal__box')

  const head = el('div', 'modal__head')
  head.append(el('h2', 'modal__title', tr.t('sharing.dialogTitle')))
  const dismiss = el('button', 'btn btn--ghost', tr.t('sharing.close'))
  dismiss.type = 'button'
  head.append(dismiss)
  box.append(head)

  box.append(el('p', 'modal__lead', tr.t('sharing.lead')))
  if (options.notice) box.append(options.notice)

  /* --- les trois issues, chacune suivie de son inventaire --- */

  const choices = el('fieldset', 'sharing__choices')
  const legend = el('legend', 'sr-only')
  legend.textContent = tr.t('sharing.legend')
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
  ): { panel: HTMLElement; retitle: (text: string) => void } => {
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
    input.setAttribute('aria-label', tr.t('sharing.choiceLabel', { title, note }))
    const body = el('span', 'sharing__choiceBody')
    const noteBox = el('span', 'sharing__choiceNote', note)
    body.append(el('span', 'sharing__choiceTitle', title), noteBox)
    if (detail !== undefined) {
      const curious = el('details', 'sharing__curious')
      curious.append(el('summary', 'sharing__curiousHead', tr.t('sharing.curiousHead')))
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
    // La note change quand le pilote choisit ses pages : le nom accessible du bouton
    // radio la porte, il doit changer avec elle. Un nom figé dirait « toutes vos pages »
    // à qui n'en a coché qu'une.
    const retitle = (text: string): void => {
      noteBox.textContent = text
      input.setAttribute('aria-label', tr.t('sharing.choiceLabel', { title, note: text }))
    }
    return { panel, retitle }
  }

  const counts = plan.personal.counts

  // Trois phrases entières, assemblées et non taillées : la garantie sur les octets, ce
  // que le fichier contient, et les deux chiffres. Une phrase absente ne laisse pas
  // d'espace derrière elle.
  const plainNote = [
    plan.modified ? tr.t(FIDELITY_MODIFIED) : tr.t(FIDELITY_UNCHANGED),
    plan.exportType === 'pages'
      ? tr.t('sharing.plainContentPages')
      : tr.t('sharing.plainContentBackup')
  ]

  // Les deux chiffres, nommés, et jamais additionnés : ils ne répondent pas à la même
  // question. Celui de la disposition est le seul qui survive à un export « pages ».
  if (counts.total > 0) {
    plainNote.push(tr.t('sharing.plainTally', {
      layout: tr.t('sharing.personalInLayout', { count: counts.layout }),
      preferences: tr.t('sharing.personalInPreferences', { count: counts.preferences })
    }))
  }

  const plainDetail = plan.modified
    ? tr.t(FIDELITY_MODIFIED_DETAIL)
    : tr.t(FIDELITY_UNCHANGED_DETAIL)

  // « Fichier complet » n'était juste pour aucun des deux formats : un export « pages »
  // n'a rien de complet, il ne porte pas les préférences. Ce que le mot opposait en
  // réalité, c'est « tel qu'il est » à « expurgé ».
  buildChoice(
    'plain', tr.t('sharing.plainTitle'), plainNote.join(' '), true, plainDetail
  )

  const offers = (form: SharingForm): boolean => plan.forms.includes(form)

  // Le chiffre est dans la carte, avant le volet : c'est ce qui permet de choisir sans
  // dérouler l'inventaire, et l'inventaire reste là pour qui veut vérifier.
  const backupNote = plan.backup.changed === 0
    ? tr.t('sharing.backupNoteUnchanged')
    : tr.t('sharing.backupNoteChanged', { count: plan.backup.changed })

  const backupPanel = offers('backup')
    ? buildChoice('backup', tr.t('sharing.backupTitle'), backupNote, false).panel
    : undefined

  const pagesChoice = buildChoice(
    'pages', tr.t('sharing.pagesTitle'), tr.t('sharing.pagesNote'), false
  )
  const pagesPanel = pagesChoice.panel

  box.append(choices)

  /* --- ce que chaque issue fait, montré avant de le faire --- */

  const residual = tr.t('sharing.residualNote')

  if (backupPanel !== undefined) {
    backupPanel.append(preferencesSection(plan.backup, tr, prose, why))
    backupPanel.append(replacementsSection(
      plan.backup.replacements, plan.personal,
      { remindPreferences: false, caveat: residual }, language, tr, prose, why
    ))
    backupPanel.append(backupCostSection(tr))
    const backupAnnexes = annexesSection(plan.backup, tr)
    if (backupAnnexes) backupPanel.append(backupAnnexes)
    backupPanel.append(suspectsSection(plan.backup.suspects, tr, prose, why))
  }

  /*
   * Choisir ses pages **avant** de lire ce que le fichier emportera : le reste du volet
   * décrit le fichier produit, et un inventaire qui décrirait un autre fichier que celui
   * qu'on va télécharger vaudrait moins que pas d'inventaire du tout. D'où le
   * recalcul complet — `planPages` — à chaque case cochée.
   */
  const offersList = offeredPages(options.source.document, plan.personal)
  const refKey = (ref: PageRef): string => `${ref.orientation}:${ref.rank}`
  const chosenPages = new Set(offersList.map((offer) => refKey(offer.ref)))
  let pagesPlan = plan.pages

  const chooser = el('section', 'sharing__section sharing__pagesChoice')
  chooser.append(el('h3', 'sharing__heading', tr.t('sharing.pagesChoiceHeading')))
  chooser.append(el('p', 'sharing__note', tr.t('sharing.pagesChoiceIntro', {
    count: offersList.length
  })))

  const chosenLine = el('p', 'sharing__note sharing__pagesTally')
  const outcome = el('div', 'sharing__pagesOutcome')

  const rebuildOutcome = (): void => {
    const selection: PageRef[] = offersList
      .filter((offer) => chosenPages.has(refKey(offer.ref)))
      .map((offer) => offer.ref)
    pagesPlan = planPages(options.source, when, selection)

    chosenLine.textContent = selection.length === 0
      ? tr.t('sharing.pagesChoiceEmpty')
      : tr.t('sharing.pagesSelectedCount', {
        count: selection.length, total: offersList.length
      })
    pagesChoice.retitle(selection.length === offersList.length
      ? tr.t('sharing.pagesNote')
      : `${tr.t('sharing.pagesNote')} ${chosenLine.textContent}`)

    outcome.replaceChildren()
    if (selection.length === 0) return
    outcome.append(pagesImportSection(pagesPlan, tr))
    outcome.append(droppedSection(pagesPlan, tr))
    const pagesAnnexes = annexesSection(pagesPlan, tr)
    if (pagesAnnexes) outcome.append(pagesAnnexes)
    outcome.append(replacementsSection(
      pagesPlan.replacements, plan.personal,
      { remindPreferences: true, caveat: residual }, language, tr, prose, why
    ))
    outcome.append(suspectsSection(pagesPlan.suspects, tr, prose, why))
  }

  const pageList = el('ul', 'sharing__list sharing__list--plain sharing__pages')
  for (const offer of offersList) {
    const item = el('li', 'sharing__page')
    const label = el('label', 'sharing__pageLabel')
    const box2 = el('input', 'sharing__pageBox')
    box2.type = 'checkbox'
    box2.checked = true
    box2.addEventListener('change', () => {
      if (box2.checked) chosenPages.add(refKey(offer.ref))
      else chosenPages.delete(refKey(offer.ref))
      rebuildOutcome()
      refreshConfirm()
    })
    label.append(box2, el('span', 'sharing__pageName', pageOfferLabel(offer, language, tr)))
    item.append(label)
    pageList.append(item)
  }
  chooser.append(pageList)

  const bulk = el('div', 'sharing__pagesBulk')
  const setAll = (checked: boolean): void => {
    for (const input of pageList.querySelectorAll('input')) input.checked = checked
    chosenPages.clear()
    if (checked) for (const offer of offersList) chosenPages.add(refKey(offer.ref))
    rebuildOutcome()
    refreshConfirm()
  }
  const checkAll = el('button', 'btn btn--ghost', tr.t('sharing.pagesChoiceAll'))
  checkAll.type = 'button'
  checkAll.addEventListener('click', () => { setAll(true) })
  const clearAll = el('button', 'btn btn--ghost', tr.t('sharing.pagesChoiceClear'))
  clearAll.type = 'button'
  clearAll.addEventListener('click', () => { setAll(false) })
  bulk.append(checkAll, clearAll)
  chooser.append(bulk)
  chooser.append(chosenLine)

  pagesPanel.append(chooser, outcome)
  rebuildOutcome()

  const inventory = personalSection(plan.personal, tr, prose)
  if (inventory) box.append(inventory)

  /* --- le nom produit --- */

  const fileNameLine = el('p', 'modal__name')
  box.append(fileNameLine)

  const chosenForm = (): SharingForm =>
    inputs.find((one) => one.input.checked)?.form ?? 'plain'

  const FILE_NAMES: Record<SharingForm, () => string> = {
    plain: () => plan.plainFileName,
    backup: () => plan.backup.fileName,
    pages: () => pagesPlan.fileName
  }

  const cancel = el('button', 'btn', tr.t('sharing.cancel'))
  cancel.type = 'button'
  const confirm = el('button', 'btn btn--primary', tr.t('sharing.confirm'))
  confirm.type = 'button'

  // Un fichier sans une seule page n'est pas un fichier partageable : il remplacerait les
  // pages du destinataire par rien. Le bouton se coupe, et la phrase qui dit pourquoi est
  // déjà sous les cases — même forme que le panneau de nettoyage, qui refuse « Aucun
  // réglage coché ».
  const refreshConfirm = (): void => {
    confirm.disabled = chosenForm() === 'pages' && chosenPages.size === 0
  }

  const refresh = (): void => {
    const form = chosenForm()
    for (const one of panels) one.panel.hidden = one.form !== form
    fileNameLine.textContent = tr.t('sharing.producedFileName', { name: FILE_NAMES[form]() })
    refreshConfirm()
  }
  for (const one of inputs) one.input.addEventListener('change', refresh)
  refresh()

  /* --- confirmer ou renoncer --- */

  const actions = el('div', 'modal__actions')
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
    if (form === 'pages' && chosenPages.size === 0) return
    handle.close()
    if (form !== 'plain') {
      const chosen = form === 'backup' ? plan.backup : pagesPlan
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
