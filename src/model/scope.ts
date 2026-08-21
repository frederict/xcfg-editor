import type { JsonNode } from '../core/jsonDocument'
import { decode, encode, getMember, hasMember, insertString, readString, setString } from '../core/access'
import type { Layout } from './layout'
import { cloneNode, type Orientation } from './mutations'

/**
 * Ce qu'un document laisse voir de son propriétaire — et comment en dériver un gabarit
 * qui n'en laisse rien voir.
 *
 * ## Pourquoi ce module n'est pas un filtre de données personnelles
 *
 * Un export « backup » porte le nom du pilote, sa voile et ses réglages de performance,
 * ses choix de diffusion Livetrack, ses fichiers de waypoints — dont le nom de la
 * compétition à laquelle il participe — et ses capteurs Bluetooth appairés, identifiants
 * d'appareils compris. On pourrait dresser la liste de ces clés et les retirer une à une.
 *
 * **Ce serait la mauvaise conception.** Une liste noire est fausse le jour où XCTrack
 * ajoute une préférence : le corpus mesure 15 clés de préférence apparues entre 0.9.12.3
 * et 1.0.3-beta (`docs/reference/corpus-air3.md` § 5). Un filtre écrit aujourd'hui laisse
 * donc passer, demain, exactement ce qu'il était censé retenir, et personne ne s'en
 * aperçoit — le pire mode de défaillance qui soit pour de la confidentialité.
 *
 * **XCTrack a déjà tranché à notre place.** Il connaît deux formats d'export
 * (`docs/specs/2026-08-20-xcfg-editor-design.md` § 2.2) : `backup`, qui porte
 * `info`, `layout`, `preferences` et `airspaceSelectedChannels` ; et `pages`, qui ne
 * porte que `info` et `layout`. Le manuel AIR³ recommande de n'échanger que des `pages`
 * entre appareils différents. Dériver un `pages`, ce n'est donc pas nettoyer : c'est
 * **choisir le format qu'on exporte**. La confidentialité devient une propriété
 * structurelle du document — il n'y a rien à retenir parce qu'il n'y a rien à mettre.
 *
 * D'où la règle d'implémentation, qui est l'inverse d'un filtre : **on ne retire pas les
 * clés connues comme sensibles, on ne garde que les deux clés connues comme sûres**
 * (`PAGES_ROOT_KEYS`). Une clé de premier niveau qu'aucune version connue ne documente
 * est écartée sans qu'on ait besoin de savoir ce qu'elle contient. C'est ce qui fait
 * tenir la propriété à travers les versions à venir.
 *
 * ## Ce que le `layout` porte quand même, et pourquoi on le montre
 *
 * Le `layout` n'est pas vierge : quelques clés portent du texte écrit par le pilote, et
 * elles survivent à la dérivation puisqu'elles voyagent avec la page. `findFreeTexts` en
 * rend l'inventaire exact. **Ce module ne les touche pas** — même éthique que
 * `warnings.ts` : « on signale, on ne corrige jamais ». Retirer en silence le titre
 * personnalisé d'un widget changerait le gabarit sans le dire, et un pilote qui ne peut
 * pas prévoir ce que l'outil fait de son fichier ne s'en sert pas.
 *
 * Les remplacer est un geste **demandé**, donc explicite, donc ailleurs : `sharing.ts`
 * s'en charge, sur une copie, et rend la liste de ce qu'il a changé. Ce fichier lui prête
 * seulement `findFreeTextNodes`.
 */

/* ------------------------------------------------------ dérivation « backup » → « pages » */

/**
 * Les seules clés de premier niveau qu'un export `pages` porte — **liste blanche**.
 * Relevé sur les 21 fichiers du corpus (8 versions de XCTrack, 2022 → 2026) : un `pages`
 * porte `info` et `layout`, un `backup` y ajoute `airspaceSelectedChannels` et
 * `preferences`. Les quatre clés sont écrites dans l'ordre alphabétique par XCTrack, si
 * bien que filtrer un `backup` sur cette liste rend `info`, `layout` — exactement
 * l'ordre d'un `pages` réel, sans avoir à réordonner quoi que ce soit.
 */
export const PAGES_ROOT_KEYS: readonly string[] = ['info', 'layout']

/** La valeur que `info.exportType` prend dans un export `pages`. */
export const PAGES_EXPORT_TYPE = 'pages'

export interface PagesDerivation {
  /** Le document dérivé — un arbre **neuf**, indépendant de la source. */
  document: JsonNode
  /**
   * Les clés de premier niveau écartées, dans l'ordre du fichier. Sert à dire au pilote
   * ce qui ne partira pas ; vide quand la source était déjà un `pages`.
   */
  droppedRootKeys: string[]
  /** `info.exportType` de la source, pour que l'appelant sache s'il a dérivé ou recopié. */
  previousExportType: string | undefined
}

/**
 * Dérive un export `pages` depuis n'importe quel document analysé.
 *
 * ## Copie profonde, jamais de partage de nœuds
 *
 * Rendre un document dont le `layout` serait **le nœud de la source** donnerait
 * l'identité à l'octet près gratuitement — et pour cause : ce serait le même objet. Deux
 * raisons de ne pas le faire :
 *
 * 1. **Les deux documents s'aliaseraient.** Le jalon 4 veut essayer un gabarit puis
 *    revenir en arrière ; une modification du dérivé qui remonte dans l'original est
 *    exactement la corruption silencieuse que ce projet refuse.
 * 2. **La preuve deviendrait vide.** « Le `layout` sort identique » ne se teste que si
 *    les deux arbres sont distincts. Un test qui compare un objet à lui-même est vert
 *    quoi qu'il arrive, et n'apprend rien.
 *
 * On recopie donc par `cloneNode`, qui reprend chaque entrée avec sa clé et son texte
 * source — y compris les clés qu'aucune version connue ne documente. Le coût est celui
 * d'un instantané d'historique, déjà jugé négligeable dans `history.ts`.
 *
 * ## Dériver un `pages` recopie, plutôt que de rendre la source
 *
 * Rendre l'entrée telle quelle quand elle est déjà un `pages` ferait dépendre la
 * postcondition du format d'entrée : l'appelant devrait savoir, avant d'appeler, si le
 * résultat lui appartient. On recopie toujours. Sur un `pages`, la sortie est alors
 * identique à l'entrée à l'octet près, et `droppedRootKeys` est vide : la dérivation est
 * sans effet, mais son contrat ne change pas.
 *
 * ## `info` est conservé en entier, `proUpTo` compris
 *
 * Un gabarit sans `versionCode` ni `versionName` est inutilisable : c'est ce qui dit au
 * destinataire quelle version de XCTrack a écrit ces clés, et le format change à chaque
 * version. `device` situe la résolution d'origine, dont dépend la lecture du rendu.
 *
 * **`proUpTo` reste, et ce n'est pas une évidence.** C'est un attribut de licence, donc
 * lié à l'achat du pilote et non à ses pages. L'argument qui tranche n'est pas un
 * jugement de notre part, c'est une observation : `2026-08-20_pages-00.xcfg`, écrit par
 * XCTrack lui-même, **porte `proUpTo`**. Le retirer produirait un fichier que XCTrack
 * n'écrit jamais — c'est-à-dire recommencer, sur une clé, la liste noire que toute la
 * conception de ce module écarte. Si `proUpTo` devait un jour porter une date d'échéance
 * réelle (il vaut `0` partout dans le corpus, donc l'hypothèse n'est pas vérifiée), la
 * bonne réponse resterait de **l'afficher** sur la carte d'identité du gabarit, pas de
 * l'effacer.
 *
 * Seul `exportType` change : c'est lui, et lui seul, qui discrimine les deux formats.
 */
export function derivePagesDocument(source: JsonNode): PagesDerivation {
  if (source.kind !== 'object') throw new Error('objet attendu')

  const sourceInfo = getMember(source, 'info')
  const previousExportType =
    sourceInfo === undefined ? undefined : readString(sourceInfo, 'exportType')

  const entries: Array<[string, JsonNode]> = []
  const droppedRootKeys: string[] = []
  for (const [rawKey, value] of source.entries) {
    const key = decode(rawKey)
    if (PAGES_ROOT_KEYS.includes(key)) entries.push([rawKey, cloneNode(value)])
    else droppedRootKeys.push(key)
  }
  const document: JsonNode = { kind: 'object', entries }

  // Sur clé dupliquée, la dernière l'emporte — même règle de lecture que `getMember`,
  // et que XCTrack. On écrit donc là où l'outil lira.
  let infoIndex = -1
  for (let i = 0; i < entries.length; i++) {
    if (decode(entries[i]![0]) === 'info') infoIndex = i
  }
  let info = infoIndex === -1 ? undefined : entries[infoIndex]![1]
  if (info === undefined || info.kind !== 'object') {
    // Aucun fichier du corpus n'est dans ce cas. On crée quand même un `info` minimal
    // plutôt que de rendre un document muet sur son propre format : `exportType` est la
    // seule chose qui distingue un `pages` d'un `backup`, la postcondition « le document
    // rendu se déclare `pages` » doit tenir sans condition. On n'invente en revanche ni
    // `device` ni `versionCode` : une version fausse serait pire qu'une version absente.
    info = { kind: 'object', entries: [] }
    if (infoIndex === -1) entries.unshift([encode('info'), info])
    else entries[infoIndex]![1] = info
  }

  // `insertRaw` refuse une clé déjà présente ; `setRaw` refuse une clé absente. C'est
  // à l'appelant de trancher — voir `access.ts`. L'insertion se fait en queue, seule
  // position qui ne déplace aucune clé existante.
  if (hasMember(info, 'exportType')) setString(info, 'exportType', encode(PAGES_EXPORT_TYPE))
  else insertString(info, 'exportType', encode(PAGES_EXPORT_TYPE))

  return { document, droppedRootKeys, previousExportType }
}

/* ------------------------------------------------- inventaire des textes libres du layout */

/**
 * Les clés du `layout` qui portent du texte écrit par le pilote.
 *
 * ## Établie depuis le catalogue, pas depuis les fichiers sous la main
 *
 * La première version de cette liste comptait six clés. Elle était **exacte sur le
 * corpus observé et fausse sur le format** : elle avait été relevée sur les chaînes
 * réellement rencontrées dans 21 fichiers, or ces fichiers ne contiennent que 41 des
 * 84 classes de widgets. Tout ce qu'un pilote peut écrire dans un widget qu'il ne
 * possédait pas ce jour-là échappait au relevé.
 *
 * La liste est donc refaite **à partir du catalogue**, qui couvre les 84 classes :
 * `src/catalog/widgetDefaults.json` — 75 widgets écrits sur l'appareil avec leurs seules
 * clés universelles, réimportés, puis réexportés, de sorte que XCTrack a complété
 * lui-même **toutes** les clés qu'il écrit — recoupé avec les 790 couples widget × option
 * de `src/catalog/widgetOptions/base.json` pour les 9 classes restantes (widgets de débogage
 * et `WVTM`, dont la seule clé textuelle est `titletext`, déjà couverte).
 *
 * Balayage de toutes les valeurs de type **chaîne** de ces 75 widgets : 42 chemins de clé
 * distincts. Onze portent du texte libre, les 31 autres sont des énumérations ou des
 * nombres écrits en chaîne.
 *
 * | Clé | Porté par | Ce qu'elle peut contenir |
 * |---|---|---|
 * | `titletext` | 55 classes (`ValueWidget`, `TextWidget`, `WeightedTextWidget`, `MultiValueWidget`) | titre personnalisé |
 * | `text` | `WFreeText` | le contenu entier du widget |
 * | `fullName` | `WButtonPhone`, sous `contact` | le nom d'un proche |
 * | `phoneNumber` | `WButtonPhone`, sous `contact` | son numéro de téléphone |
 * | `url` | `WWebView` | une URL saisie — jeton ou identifiant compris |
 * | `title` | `WButtonIntentLauncher` | le libellé du bouton |
 * | `name` | `WButtonIntentLauncher` | le nom de l'application visée |
 * | `action` | `WButtonIntentLauncher` | une action Android, **qui peut être un URI complet** |
 * | `filter` | `WLogPeek` | un filtre de journal saisi |
 * | `suffix` | `WExternalData` | le texte placé après la valeur |
 * | `event` | `WEmitTestEvent` | un nom d'événement saisi |
 *
 * ## Ce que la liste écarte volontairement
 *
 * Onze clés de plus sont des chaînes et **ne sont pas** du texte libre. Les ramasser
 * abîmerait des réglages qui n'ont rien de personnel :
 *
 * - **des énumérations** : `_theme`, `type`, `_units`, `navigation_target`, `fontSize`,
 *   `nav_label`, `nav_target`, `speed_type`, `callType`, `soundMode`, `windStyle`,
 *   `saveButtonPos`, `theme` et `terrain` sous `mapWidget_mapAppearance`, `rotation`,
 *   `relative`, `time_format`, `altitude`, `glide`, `target`, `_altType`, `_format`,
 *   `_rotation`, `_splitdirection`, `includeWindAlgorithm`,
 *   `mapWidget_panningAirspaceList` ;
 * - **des nombres écrits en chaîne** : `_decimals` (`"0"`),
 *   `faiAreasDistanceFontSize`, `legDistanceFontSize`, `legPercentageFontSize`
 *   (`"100"`), et surtout `index` de `WExternalData` (`"1"`), qui désigne le canal de
 *   données lu — le remplacer débrancherait le widget de sa source ;
 * - **un code de langue** : `mapWidget_osmLanguage`, choisi dans une liste fermée.
 *
 * `text_size`, `text_padding`, `lines_count` et `nemo` ne peuvent pas être ramassés du
 * tout : ce sont des nombres et des booléens JSON, jamais des chaînes. Le catalogue les
 * décrit comme des contrôles « texte » — c'est le type du contrôle affiché, pas le type
 * de la valeur écrite.
 *
 * ## L'appariement se fait sur le nom de clé seul, et c'est délibéré
 *
 * On ne restreint pas `url` à `WWebView` ni `name` à `WButtonIntentLauncher`. Mesuré sur
 * les 75 widgets : chacune de ces onze clés n'est portée que par la classe indiquée —
 * il n'y a donc rien à gagner à qualifier. Il y aurait à perdre : le jour où une nouvelle
 * classe porte `phoneNumber`, un appariement par classe la laisserait passer en silence.
 * Le nom de clé seul ratisse plus large, ce qui est le bon sens de l'erreur quand il
 * s'agit de confidentialité.
 *
 * ⚠️ **Cette liste se périme.** Le schéma change à chaque version de XCTrack, et
 * l'anonymisation est le seul endroit du projet où une **liste noire** est inévitable :
 * dans le `layout`, il faut tout garder sauf quelques clés, l'inverse de la liste blanche
 * de `PAGES_ROOT_KEYS`. Une clé de texte libre apparue dans une version future partirait
 * donc en clair. La parade n'est pas dans ce fichier : c'est que l'outil **montre**
 * l'inventaire avant de publier, et que la liste soit refaite à chaque nouvel APK par la
 * routine qui régénère `widgetDefaults.json`.
 */
export const FREE_TEXT_KEYS: readonly string[] = [
  'text',
  'titletext',
  'fullName',
  'phoneNumber',
  'url',
  'name',
  'title',
  'action',
  'filter',
  'suffix',
  'event'
]

export interface FreeText {
  orientation: Orientation
  /** Rang de la page dans son orientation, **à partir de 1** : le rang que voit le pilote. */
  pageRank: number
  /**
   * Rang du widget dans le tableau `widgets`, **à partir de 1** — l'index du fichier, donc
   * l'ordre de dessin (le rang 1 est au fond). Même convention que la liste des widgets.
   */
  widgetRank: number
  className: string
  shortName: string
  /**
   * Chemin de la clé sous le widget, `/` comme séparateur — `'titletext'`, ou
   * `'contact/fullName'` pour le numéro de téléphone, qui vit dans un objet imbriqué.
   * Même convention que `findDuplicateKeys`.
   */
  keyPath: string
  text: string
}

/** Le nœud porteur d'une chaîne, seul type sur lequel un remplacement s'écrit. */
export type StringNode = Extract<JsonNode, { kind: 'string' }>

/**
 * Un texte libre **avec le nœud qui le porte**, pour l'anonymisation.
 *
 * Séparé de `FreeText` à dessein : `findFreeTexts` est fait pour être affiché, et une
 * vue destinée à l'affichage ne doit pas offrir de poignée pour modifier le document.
 * Seul `sharing.ts` a besoin d'écrire, et il travaille sur une copie.
 */
export interface FreeTextNode extends FreeText {
  node: StringNode
}

function collectFreeTexts(
  node: JsonNode,
  path: string,
  found: Array<{ keyPath: string; text: string; node: StringNode }>
): void {
  if (node.kind === 'object') {
    for (const [rawKey, value] of node.entries) {
      const key = decode(rawKey)
      const here = path === '' ? key : `${path}/${key}`
      if (value.kind === 'string') {
        // Les chaînes vides ne sont pas montrées : le corpus en compte 1 401 rien que
        // pour `titletext`. Les noyer sous le bruit reviendrait à cacher les vraies.
        // Une chaîne vide n'a par ailleurs rien à anonymiser.
        if (FREE_TEXT_KEYS.includes(key)) {
          const text = decode(value.raw)
          if (text !== '') found.push({ keyPath: here, text, node: value })
        }
      } else {
        collectFreeTexts(value, here, found)
      }
    }
  } else if (node.kind === 'array') {
    node.items.forEach((item, index) => collectFreeTexts(item, `${path}[${index}]`, found))
  }
}

/**
 * Comme `findFreeTexts`, mais chaque entrée porte en plus le nœud à réécrire.
 *
 * **Toutes les occurrences sont rendues, doublons compris.** Un widget dont `titletext`
 * est écrit deux fois (le corpus en porte des cas, cf. `findDuplicateKeys`) produit deux
 * entrées : après un remplacement, la seule postcondition prévisible est qu'aucune des
 * deux ne porte plus la valeur d'origine. N'en réécrire qu'une laisserait la donnée
 * personnelle dans le fichier, sans erreur ni signal — même raisonnement que
 * `removeMember`.
 */
export function findFreeTextNodes(layout: Layout): FreeTextNode[] {
  const result: FreeTextNode[] = []
  const orientations: Orientation[] = ['landscape', 'portrait']
  for (const orientation of orientations) {
    layout[orientation].forEach((page, pageIndex) => {
      page.widgets.forEach((widget, widgetIndex) => {
        const found: Array<{ keyPath: string; text: string; node: StringNode }> = []
        collectFreeTexts(widget.node, '', found)
        for (const { keyPath, text, node } of found) {
          result.push({
            orientation,
            pageRank: pageIndex + 1,
            widgetRank: widgetIndex + 1,
            className: widget.className,
            shortName: widget.shortName,
            keyPath,
            text,
            node
          })
        }
      })
    })
  }
  return result
}

/**
 * Inventaire exact des textes écrits par le pilote dans le `layout`, avec l'emplacement
 * de chacun. Rendu dans l'ordre du fichier : paysage puis portrait, page par page, widget
 * par widget, clé par clé.
 *
 * Destiné à être **montré avant publication** : rien ici ne modifie le document, et le
 * nœud d'origine n'est même pas exposé. C'est `sharing.ts` qui remplace, sur une copie et
 * sur demande explicite du pilote. Un inventaire vide est le cas courant — les cinq
 * fichiers d'exemple n'en portent aucun.
 */
export function findFreeTexts(layout: Layout): FreeText[] {
  // Une seule traversée pour les deux vues : l'inventaire montré au pilote et celui qui
  // sert au remplacement ne peuvent alors pas diverger. C'est la propriété qui fait
  // qu'« annoncer avant de changer » veut dire quelque chose.
  return findFreeTextNodes(layout).map(({ node: _node, ...rest }) => rest)
}

/* ------------------------------------------- ressources extérieures : absence de résultat */

/*
 * **Il n'y a pas de fonction d'inventaire des ressources extérieures du `layout`, et
 * c'est un résultat mesuré, pas un oubli.**
 *
 * `warnings.ts` en dresse une pour les `preferences` : thèmes Mapsforge, fichiers
 * d'espaces aériens, fichiers de waypoints — des chemins locaux que le destinataire n'a
 * pas. La question posée ici était : le `layout` **seul** en référence-t-il ?
 *
 * Balayage des 21 fichiers du corpus. Le `layout` ne contient, hors `CLASS` et `UUID`,
 * que 29 clés porteuses d'une chaîne non vide. Aucune ne désigne un fichier, un chemin ou une URL.
 * Les deux seules candidates plausibles n'en sont pas :
 *
 * - `theme` (`WCompMap`, `WXCAssistant`) : `'None'`, `'ClearpilotForest'`,
 *   `'ClearpilotForestDark'` — des thèmes de rendu **livrés dans l'APK**
 *   (`assets/vtm_themes/lightpilot/`), pas des fichiers du pilote ;
 * - `terrain` : `'None'`, `'Light'`, `'Dark'`, `'XContest'` — une énumération, présente
 *   telle quelle dans la table de chaînes du dex.
 *
 * La seule clé qui *serait* une ressource extérieure est `WWebView.url`, attestée par
 * l'APK 1.0.3-beta5 et **absente de tout le corpus** : aucun `WWebView` n'y figure. Elle
 * est déjà couverte par `findFreeTexts` — une URL est du texte écrit par le pilote avant
 * d'être une ressource, et la montrer avant publication est le geste utile dans les deux
 * cas.
 *
 * **Conclusion pour le jalon 4** : un gabarit `pages` ne pointe rien que son destinataire
 * n'ait déjà. Toutes les ressources extérieures d'un `.xcfg` vivent dans les
 * `preferences` — c'est-à-dire dans la partie que la dérivation ne transporte pas. Écrire
 * la fonction aujourd'hui serait inventer un besoin ; le jour où un `WWebView` apparaît
 * dans un fichier réel, elle se justifiera d'elle-même.
 */
