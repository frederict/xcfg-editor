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
 * Le `layout` n'est pas vierge : quelques clés portent du texte écrit par le pilote.
 * `findFreeTexts` en rend l'inventaire exact. **On le montre, on ne le dépouille pas** —
 * même éthique que `warnings.ts` : « on signale, on ne corrige jamais ». Retirer en
 * silence le titre personnalisé d'un widget changerait le gabarit sans le dire, et un
 * pilote qui ne peut pas prévoir ce que l'outil fait de son fichier ne s'en sert pas.
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
 * **Relevé, pas supposé.** Balayage de toutes les chaînes non vides du `layout` des
 * 21 fichiers du corpus (`Exemples/` + corpus historique 2022 → 2026), puis recoupement
 * avec les 774 couples widget × option extraits de l'APK 1.0.3-beta5. Tout le reste est
 * une énumération (`'SYS_UNIT'`, `'OPTIMIZED'`, `'ALGO_CLASSIC'`, `'SMALL'`…), un `UUID`,
 * un nom de classe, ou un nom de thème **livré avec l'application**
 * (`'ClearpilotForest'`, `'Light'`, `'XContest'` — vérifiés dans `assets/vtm_themes/`).
 *
 * | Clé | Porté par | Attesté par |
 * |---|---|---|
 * | `text` | `WFreeText` | corpus : `'ESS'`, `'Goal'`, `'TASK'`, `'Wind'`, `'Visualise le thermique 🤘'` |
 * | `titletext` | 55 classes de widget | corpus : présent 1 401 fois, **vide partout** — libre par construction |
 * | `fullName` | `WButtonPhone`, dans l'objet `contact` | corpus : présent 15 fois, vide |
 * | `phoneNumber` | `WButtonPhone`, dans l'objet `contact` | corpus : présent 15 fois, vide |
 * | `url` | `WWebView` | APK seul — aucun `WWebView` dans le corpus |
 * | `name` | `WButtonIntentLauncher` | APK seul — aucun dans le corpus |
 *
 * **Les deux clés du relevé initial (`text` et `titletext`) ne suffisaient pas** : un
 * `WButtonPhone` porte un **nom de contact et un numéro de téléphone**, dans le `layout`,
 * pas dans les `preferences`. C'est la donnée la plus sensible du lot et elle survit à la
 * dérivation, puisqu'elle voyage avec la page. Elle est vide dans tout le corpus — mais
 * un pilote qui a rangé le numéro d'un ami sur un bouton d'appel la remplirait sans se
 * douter qu'elle part avec ses pages.
 *
 * ⚠️ **Cette liste se périme.** Le schéma change à chaque version de XCTrack. La refaire
 * coûte deux minutes : balayer les chaînes non vides du `layout` du corpus, regrouper par
 * clé, et ne garder que celles dont l'ensemble des valeurs n'est pas une énumération
 * fermée. C'est la routine du jalon 3 qui devrait la reprendre à chaque nouvel APK.
 */
export const FREE_TEXT_KEYS: readonly string[] = [
  'text',
  'titletext',
  'fullName',
  'phoneNumber',
  'url',
  'name'
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

function collectFreeTexts(
  node: JsonNode,
  path: string,
  found: Array<{ keyPath: string; text: string }>
): void {
  if (node.kind === 'object') {
    for (const [rawKey, value] of node.entries) {
      const key = decode(rawKey)
      const here = path === '' ? key : `${path}/${key}`
      if (value.kind === 'string') {
        // Les chaînes vides ne sont pas montrées : le corpus en compte 1 401 rien que
        // pour `titletext`. Les noyer sous le bruit reviendrait à cacher les vraies.
        if (FREE_TEXT_KEYS.includes(key)) {
          const text = decode(value.raw)
          if (text !== '') found.push({ keyPath: here, text })
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
 * Inventaire exact des textes écrits par le pilote dans le `layout`, avec l'emplacement
 * de chacun. Rendu dans l'ordre du fichier : paysage puis portrait, page par page, widget
 * par widget, clé par clé.
 *
 * Destiné à être **montré avant publication**, pas à filtrer quoi que ce soit : rien ici
 * ne modifie le document. Un inventaire vide est le cas courant — les cinq fichiers de
 * `Exemples/` n'en portent aucun.
 */
export function findFreeTexts(layout: Layout): FreeText[] {
  const result: FreeText[] = []
  const orientations: Orientation[] = ['landscape', 'portrait']
  for (const orientation of orientations) {
    layout[orientation].forEach((page, pageIndex) => {
      page.widgets.forEach((widget, widgetIndex) => {
        const found: Array<{ keyPath: string; text: string }> = []
        collectFreeTexts(widget.node, '', found)
        for (const { keyPath, text } of found) {
          result.push({
            orientation,
            pageRank: pageIndex + 1,
            widgetRank: widgetIndex + 1,
            className: widget.className,
            shortName: widget.shortName,
            keyPath,
            text
          })
        }
      })
    })
  }
  return result
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
