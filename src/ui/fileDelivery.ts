/**
 * # Sortir un fichier du navigateur, et savoir si c'est arrivé
 *
 * Ce module ne fabrique aucun octet et n'en réécrit aucun : il reçoit une fonction qui les
 * produit, et s'occupe **du seul geste que cet outil ne maîtrise pas** — la remise du
 * fichier au monde extérieur.
 *
 * ## Le défaut qu'il corrige
 *
 * Le chemin classique — un `<a download>` fabriqué puis cliqué — ne rend **aucun compte**.
 * Trois mesures indépendantes du 22 août 2026 le montrent :
 *
 * - trois enregistrements de suite dans un onglet, **trois arrivés** ; trois dans un autre
 *   onglet quatre minutes plus tard, même code, même fichier, même geste, **zéro arrivé** ;
 * - un pilote d'essai en a enchaîné **quatre : aucun n'est arrivé**, tous restés en
 *   fichiers temporaires Chrome jamais finalisés ;
 * - le refus ne dépend ni du rang de l'enregistrement, ni de rien que la page puisse lire :
 *   aucune exception, aucun événement, `link.click()` rend la main de la même façon.
 *
 * D'où la phrase que l'outil sert sur ce chemin-là, et qui reste vraie : il a **demandé**
 * au navigateur d'enregistrer, et c'est tout ce qu'il peut dire.
 *
 * ## Ce que `showSaveFilePicker` prouve — et ce qu'il ne prouve pas
 *
 * ⚠ **Il ne suffit pas que la boîte se ferme.** Ce qui est établi, mesuré le 22 août 2026
 * dans Chrome 151 sur macOS, `http://localhost` (contexte sécurisé) :
 *
 * - le fichier cible **reste vide tant que `close()` n'a pas rendu la main** — 0 octet
 *   après `write()`, 12 octets après `close()`, sur une sonde de douze octets choisis
 *   difficiles (BOM, CRLF, octet nul, `0xFF`, deux octets d'un `é` en UTF-8) ;
 * - ces douze octets relus depuis le disque, **hors du navigateur**, par `xxd` puis
 *   `shasum -a 256`, sont exactement ceux qui ont été écrits.
 *
 * Donc : **`close()` qui rend la main sans rejeter prouve que le navigateur a écrit ces
 * octets-là dans le fichier que le pilote a désigné.** C'est strictement plus qu'une boîte
 * validée, et strictement plus que ce que le chemin classique permet de dire.
 *
 * Ce que cela ne prouve **pas**, et que le reçu ne doit donc pas affirmer : rien sur ce que
 * le fichier devient après — un dossier synchronisé, une clé USB retirée, un antivirus.
 * L'outil rapporte l'écriture, pas la conservation.
 *
 * ## Les cinq issues, et pourquoi trois d'entre elles retombent sur le chemin classique
 *
 * ```
 * 1. pas d'API dans ce navigateur ............... repli, reçu classique
 * 2. la boîte rejette avec « AbortError » ....... annulé : rien n'est fabriqué, rien n'est dit d'un échec
 * 3. la boîte rejette autrement ................. repli, reçu classique
 * 4. écriture confirmée par `close()` ........... écrit : le reçu peut le dire
 * 5. l'écriture rejette en cours ................ repli, reçu classique
 * ```
 *
 * Le repli est **le code d'avant, inchangé** — même `Blob`, même lien, même discipline de
 * révocation différée. Trois des cinq issues y mènent, et c'est délibéré : un pilote dont
 * l'écriture directe échoue ne doit pas se retrouver sans fichier, et la phrase du chemin
 * classique — « cet outil a demandé à votre navigateur de l'enregistrer », « cette page ne
 * voit pas ce qui s'y passe » — est vraie dans ces trois cas-là sans qu'on ait rien à
 * inventer.
 *
 * ⚠ **Ce que la boîte laisse derrière elle, mesuré et à savoir.** Le 22 août 2026, Chrome
 * 151 : `showSaveFilePicker` qui rend une poignée **crée le fichier tout de suite**, à
 * 0 octet, avant qu'on ait écrit quoi que ce soit — relevé au `ls` sur un fichier dont on
 * n'a jamais ouvert de flux. Conséquence : si `bytes()` échoue **après** la boîte — une
 * sérialisation, une archive impossible à produire —, le pilote se retrouve avec un fichier
 * vide portant le nom qu'il vient de donner, et l'appelant dit « le fichier n'a pas pu être
 * fabriqué ». Ce n'est pas contradictoire, mais ce n'est pas complet ; le cas n'a jamais été
 * observé, et le jour où il le sera c'est cette phrase-là qui devra le dire.
 *
 * ⚠ **L'issue 5 n'est pas mesurée** — disque plein, permission retirée, volume démonté.
 * Décision explicite du propriétaire le 22 août 2026 : on la couvrira le jour où le cas se
 * présente. Le code la traite comme les issues 1 et 3, sans rien affirmer de particulier ;
 * ce qui est mesuré du flux d'écriture l'a été sur le système de fichiers privé d'origine
 * (`navigator.storage.getDirectory()`), qui emploie **le même**
 * `FileSystemWritableFileStream` mais **pas** la même origine de poignée : un dépassement de
 * quota y rejette en `QuotaExceededError`, et `abort()` y laisse la cible avec son contenu
 * d'avant, intact. Ces deux relevés-là sont donc du voisinage, pas de la boîte.
 *
 * ## Où l'API existe
 *
 * Relevé sur caniuse le 22 août 2026 : Chrome et Edge 105+, Opera 91+, **et rien d'autre**.
 * Ni Firefox, ni Safari, ni **aucun navigateur mobile** — ni Chrome pour Android, ni Safari
 * iOS, ni Samsung Internet, ni Firefox pour Android. Environ 26,9 % de l'usage mondial.
 * Une part des pilotes vole avec un téléphone : pour eux, le chemin classique **est** le
 * chemin, et c'est pourquoi il ne doit jamais empirer.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne parle pas. Aucune prose, aucun catalogue, aucun DOM d'écran : il rend ce qui s'est
 * passé, et l'appelant le dit dans la langue du pilote. C'est ce qui permet à
 * `tests/ui/fileDelivery.test.ts` de parcourir les cinq issues sans monter d'interface.
 *
 * ## Les autres points de sortie du dépôt
 *
 * `src/ui/libraryPanel.ts` en porte deux — récupérer une configuration rangée, exporter la
 * bibliothèque entière en archive — par son propre `defaultDownload`, resté sur le chemin
 * classique. Ils ne sont pas branchés ici : leur prose annonce aujourd'hui une archive
 * « téléchargée », ce qui demande le même travail de reformulation dans cinq langues, et
 * l'export de la bibliothèque commande en plus un effacement (« Exporter d'abord, puis tout
 * effacer ») dont le verrou mérite d'être repris avec sa mesure à lui.
 */

/** Ce qu'il a fallu remettre, et sous quel nom. Les octets sont produits à la demande. */
export interface DeliveryRequest {
  /**
   * Le nom proposé. Il vient de `buildExportFileName` (`src/model/sharing.ts`), qui
   * l'horodate et **ne reprend jamais le nom d'origine** — ce nom porte souvent un prénom.
   * La boîte le montre au pilote, qui reste libre de le changer.
   */
  readonly fileName: string
  /**
   * Les octets, fabriqués **seulement si le pilote n'a pas annulé**. C'est la raison d'être
   * de cette fonction : la boîte s'ouvre avant qu'on sérialise quoi que ce soit, un
   * abandon ne coûte donc rien, et l'appel à l'API tombe dans l'activation du clic.
   */
  readonly bytes: () => Promise<Uint8Array>
}

/**
 * Ce qui s'est passé.
 *
 * `written` est le seul cas où l'outil a de quoi affirmer une écriture ; `handedOver` est
 * le chemin classique, qui n'affirme qu'une demande ; `cancelled` n'est **pas** un échec —
 * un pilote qui referme une boîte n'a subi aucune panne, et rien n'a été fabriqué.
 */
export type Delivery =
  | { readonly kind: 'written'; readonly fileName: string; readonly byteLength: number }
  | { readonly kind: 'handedOver'; readonly fileName: string; readonly byteLength: number }
  | { readonly kind: 'cancelled' }

/** La signature de `window.showSaveFilePicker`, que `lib.dom` ne déclare pas encore. */
export type SaveFilePicker = (
  options?: { suggestedName?: string }
) => Promise<FileSystemFileHandle>

/**
 * Le monde extérieur, injectable. Aucun test ne peut cliquer un vrai téléchargement ni
 * ouvrir une vraie boîte du système : c'est par ici qu'on les remplace.
 */
export interface DeliveryEnvironment {
  /** `undefined` là où le navigateur n'a pas l'API — Firefox, Safari, tout le mobile. */
  readonly picker: SaveFilePicker | undefined
  /** Le chemin classique : fabriquer un lien objet et le cliquer. */
  readonly handOver: (bytes: Uint8Array, fileName: string) => void
}

/**
 * L'URL du dernier fichier remis par le chemin classique, gardée en vie.
 *
 * Elle était révoquée **dans la milliseconde** qui suivait `link.click()` — relevé à
 * l'horloge : même valeur de `performance.now()` pour le clic et la révocation. Le
 * navigateur n'a alors aucune garantie d'avoir fini de lire le `Blob`. La révocation attend
 * donc la remise suivante : un seul objet vit à la fois, et plus rien ne court après le
 * clic. ⚠ Ce comportement est celui d'avant, déplacé tel quel ; il ne se rejuge pas ici.
 */
let deliveredUrl: string | undefined

/** Le chemin classique, mot pour mot celui d'avant. */
export function handOverToBrowser(bytes: Uint8Array, fileName: string): void {
  // Copie dans un `ArrayBuffer` simple : `Blob` n'accepte pas une vue dont le tampon
  // pourrait être partagé, et le conteneur ne garantit rien de son origine.
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }))
  // La précédente, et elle seule : celle-ci vient d'être remise au navigateur.
  if (deliveredUrl !== undefined) URL.revokeObjectURL(deliveredUrl)
  deliveredUrl = url
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
}

function browserEnvironment(): DeliveryEnvironment {
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  return { picker: typeof picker === 'function' ? picker : undefined, handOver: handOverToBrowser }
}

/**
 * Le rejet qui veut dire « le pilote a refermé la boîte ».
 *
 * ⚠ La spécification met **autre chose** sous le même nom : le navigateur qui juge le
 * fichier choisi trop sensible lève lui aussi `AbortError`, et rien ne distingue les deux.
 * C'est pourquoi la phrase servie dit ce qui s'est passé — la boîte s'est refermée sans
 * rien écrire — et non qui l'a voulu.
 */
function isCancellation(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Remettre les octets au pilote, par le meilleur chemin que ce navigateur offre.
 *
 * ⚠ **À appeler dans l'activation du clic.** `showSaveFilePicker` exige une activation
 * transitoire et un contexte sécurisé ; sans elle il lève `SecurityError`, ce qui retombe
 * ici sur le chemin classique — le pilote a son fichier, l'outil n'a simplement pas d'accusé
 * à lui montrer. C'est aussi pourquoi la boîte est ouverte **avant** que `bytes()` soit
 * appelée : une sérialisation longue mangerait l'activation.
 */
export async function deliverBytes(
  request: DeliveryRequest, environment: DeliveryEnvironment = browserEnvironment()
): Promise<Delivery> {
  const { picker } = environment
  if (picker !== undefined) {
    let handle: FileSystemFileHandle | undefined
    try {
      handle = await picker({ suggestedName: request.fileName })
    } catch (error) {
      if (isCancellation(error)) return { kind: 'cancelled' }
      // Tout le reste — activation perdue, appel bloqué, extension refusée — n'est pas un
      // refus du pilote : on lui donne son fichier par l'autre chemin.
      handle = undefined
    }
    if (handle !== undefined) {
      const bytes = await request.bytes()
      try {
        const stream = await handle.createWritable()
        await stream.write(toPlainBuffer(bytes))
        // C'est ici, et nulle part avant, que le fichier cible reçoit les octets.
        await stream.close()
        return { kind: 'written', fileName: handle.name, byteLength: bytes.byteLength }
      } catch {
        // Issue non mesurée. On ne dit rien de particulier : le chemin classique reprend la
        // main et sa phrase — « cet outil a demandé », « cette page ne voit pas ce qui s'y
        // passe » — reste vraie sans qu'on ait à inventer une promesse.
        environment.handOver(bytes, request.fileName)
        return { kind: 'handedOver', fileName: request.fileName, byteLength: bytes.byteLength }
      }
    }
  }
  const bytes = await request.bytes()
  environment.handOver(bytes, request.fileName)
  return { kind: 'handedOver', fileName: request.fileName, byteLength: bytes.byteLength }
}

/**
 * Les octets, dans un tampon qui n'appartient qu'à eux.
 *
 * Même précaution que le `Blob` du chemin classique : ni `write()` ni `Blob` n'acceptent
 * une vue dont le tampon pourrait être partagé, et le conteneur ne garantit rien de
 * l'origine du sien. La copie ne change **aucun octet** — c'est ce que
 * `tests/ui/fileDelivery.test.ts` vérifie sur les douze octets difficiles de la sonde.
 */
function toPlainBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}
