import { openContainer, type Container } from '../core/container'
import type { Device } from '../catalog/devices'
import type { PreviewRef } from '../library/library'
import { readLayout, type Layout, type Page } from '../model/layout'
import { readRenderSettings } from '../model/preferences'
import { findFreeTexts } from '../model/scope'
import { renderPage } from '../render/canvas'
// Effet de bord : enregistre les dessins réels (numériques, barre d'état, cartes,
// boussoles…). Sans lui, `renderPage` ne poserait que des repères génériques, et la
// vignette ne ressemblerait à rien de ce que le pilote voit sur son instrument.
import '../render/widgets'
import { aspectRatioOf, type Orientation } from './views'

/**
 * La vignette d'une entrée de bibliothèque : **une page, dessinée, sans les mots du
 * pilote**.
 *
 * ## Pourquoi ce fichier est dans `src/ui/` et non dans `src/library/`
 *
 * `library.ts` le dit dans le contrat de `setPreview` : « les octets viennent d'ailleurs,
 * pas d'ici ». La couche de rangement ne dépend ni de `src/render/` ni des 22 dessins de
 * widgets — c'est une propriété mesurée (`src/library/index.ts`, § Le poids) et la garder
 * a une valeur : la bibliothèque se charge sans écran. L'image, elle, est un fait
 * d'interface ; elle se fabrique donc ici, et la couche de rangement ne fait que la
 * ranger.
 *
 * ## Quelle page — la première que l'appareil montre, en paysage
 *
 * Le pilote reconnaît sa configuration à ce qu'il voit au décollage, et au décollage
 * l'AIR³ est en paysage. Une configuration peut n'avoir que du portrait : on prend alors
 * le portrait, plutôt que de ne rien montrer.
 *
 * Dans une orientation, on saute les pages que l'appareil **ne montre jamais** —
 * `navigations: "none"`, la seule règle mesurée sur l'instrument
 * (`docs/reference/2026-08-22-essai-pilote.md` § 2 : huit appuis, cinq pages sur six en
 * boucle, la sautée étant celle-là). Le corpus en porte une par configuration, en
 * deuxième position ; la prendre pour vignette montrerait au pilote une page qu'il ne
 * voit pas. Si **toutes** les pages d'une orientation sont dans ce cas, on rend quand
 * même la première : une vignette imparfaite vaut mieux qu'un trou.
 *
 * ## Les mots du pilote sont masqués — et ce n'est pas un excès de prudence
 *
 * Une vignette est une **image** des textes de la page. Elle échappe donc à tout le
 * travail d'anonymisation du projet, qui opère sur le document JSON : `sharing.ts` peut
 * remplacer les 11 clés de texte libre du `layout`, une image, elle, garde le nom du
 * proche et son numéro de téléphone en pixels. Un `WFreeText` porte ce que le pilote y a
 * écrit ; un `WButtonPhone` porte un nom et un numéro.
 *
 * Le projet a déjà payé ce prix une fois : une capture d'un instrument affichant une
 * carte a révélé un domicile au bâtiment près, et il a fallu purger l'historique du
 * dépôt. La règle du dépôt est **prudent par défaut, et dit ce qu'il fait** — d'où le
 * choix ici : les gadgets qui portent un texte libre **non vide** sont dessinés avec leur
 * cadre, leur fond et leur place, mais leur contenu est remplacé par une barre grise. La
 * composition de la page — ce qui la rend reconnaissable — est intacte ; les mots ne le
 * sont pas.
 *
 * L'inventaire des textes libres n'est pas refait ici : c'est `findFreeTexts` de
 * `src/model/scope.ts`, celui-là même que la carte d'identité affiche et que la boîte de
 * partage remplace. Une seule liste pour les trois usages, donc aucune divergence
 * possible entre ce qu'on annonce, ce qu'on remplace et ce qu'on masque.
 *
 * ## Ce que la vignette n'est pas
 *
 * Ce n'est **pas** une image autonome. Le SVG rangé porte la géométrie de la page et le
 * texte des gadgets ; son habillage vient de `src/ui/style.css`, comme pour toute page
 * dessinée par cet éditeur. Elle s'affiche donc **dans le document** (`showPreview`), pas
 * dans une balise `<img>` — exactement ce que fait déjà la palette de gadgets. C'est
 * aussi la raison pour laquelle l'archive de bibliothèque ne l'emporte pas : hors de
 * l'éditeur, elle ne montrerait rien. Voir `src/library/transfer.ts`.
 */

/** Le type de média déclaré dans `PreviewRef` — jamais deviné, voir son commentaire. */
export const PREVIEW_MEDIA_TYPE = 'image/svg+xml'

/** La vignette produite : les octets à ranger, et la fiche qui les décrit. */
export interface Preview {
  bytes: Uint8Array
  ref: Omit<PreviewRef, 'byteLength'>
}

export interface PreviewSource {
  /** Les octets de la configuration, tels qu'ils sont rangés. */
  bytes: Uint8Array
  fileName: string
  /**
   * Le gabarit d'écran, pour les proportions de la page. Il vient de
   * `entry.identity.assumed.device` : c'est une **supposition** de cet éditeur, et une
   * vignette aux mauvaises proportions est le pire qu'elle puisse coûter.
   */
  device: Device
  /** Langue des libellés de gadgets — axe `labels`, celui du fichier ouvert. */
  language: string
}

/** La page choisie, avec de quoi la nommer au pilote. */
export interface ChosenPage {
  page: Page
  orientation: Orientation
  /** Rang dans son orientation, **à partir de 1** — le rang que voit le pilote. */
  pageRank: number
}

const shownByDevice = (page: Page): boolean => page.navigations.kind !== 'none'

/** Voir le § « Quelle page » en tête de fichier. */
export function choosePreviewPage(layout: Layout): ChosenPage | undefined {
  const orientations: Orientation[] = ['landscape', 'portrait']
  for (const orientation of orientations) {
    const pages = layout[orientation]
    if (pages.length === 0) continue
    const index = pages.findIndex(shownByDevice)
    const rank = index === -1 ? 0 : index
    return { page: pages[rank]!, orientation, pageRank: rank + 1 }
  }
  return undefined
}

/**
 * Les rangs des gadgets de cette page qui portent un texte **écrit par le pilote et non
 * vide**. Rangs à partir de 1, comme `FreeText.widgetRank` : c'est l'ordre du fichier,
 * donc l'ordre de dessin, donc l'ordre dans lequel `renderPage` émet ses éléments.
 */
export function redactedRanks(layout: Layout, chosen: ChosenPage): Set<number> {
  return new Set(findFreeTexts(layout)
    .filter((text) => text.orientation === chosen.orientation && text.pageRank === chosen.pageRank)
    .map((text) => text.widgetRank))
}

/**
 * La barre grise, en style **posé sur l'élément** et non en classe : elle doit tenir sans
 * rien devoir à une feuille de style, y compris le jour où quelqu'un regarde le SVG rangé
 * hors de l'éditeur. `.xc-widget__content` est en `position: relative` (style.css), les
 * pourcentages se lisent donc dans le cadre du gadget.
 */
const REDACTION_STYLE =
  'position:absolute;left:8%;right:8%;top:38%;height:24%;min-height:2px;' +
  'background:#9a9a9a;border-radius:3px'

/**
 * Remplace le contenu des gadgets désignés par une barre grise, **sur l'arbre déjà
 * dessiné**. Le cadre, le fond et la place ne bougent pas : c'est ce qui garde la page
 * reconnaissable.
 *
 * `renderPage` émet un `.xc-widget` par entrée de `page.widgets`, dans l'ordre du
 * tableau — c'est son contrat, et l'ordre de dessin de XCTrack.
 */
export function redactScene(scene: SVGSVGElement, ranks: ReadonlySet<number>): void {
  if (ranks.size === 0) return
  const widgets = scene.querySelectorAll('.xc-widget')
  widgets.forEach((element, index) => {
    if (!ranks.has(index + 1)) return
    const content = element.querySelector('.xc-widget__content')
    if (content === null) return
    content.textContent = ''
    const bar = document.createElement('div')
    bar.setAttribute('style', REDACTION_STYLE)
    content.append(bar)
  })
}

/** Les deux dimensions du repère de référence, lues sur le `viewBox` que pose `renderPage`. */
function viewBoxSize(scene: SVGSVGElement): { widthPx: number; heightPx: number } {
  const parts = (scene.getAttribute('viewBox') ?? '').split(/\s+/)
  return {
    widthPx: Math.round(Number(parts[2] ?? 0)),
    heightPx: Math.round(Number(parts[3] ?? 0))
  }
}

/**
 * Fabrique la vignette d'une configuration.
 *
 * Rend `undefined` — jamais une exception — quand il n'y a rien à dessiner : fichier
 * illisible, `layout` absent, aucune page. L'absence de vignette est un état normal que
 * l'interface sait montrer ; une panne au milieu d'un rafraîchissement de liste, non.
 */
export async function makeLibraryPreview(source: PreviewSource): Promise<Preview | undefined> {
  let container: Container
  try {
    container = await openContainer(source.bytes, source.fileName)
  } catch {
    return undefined
  }
  if (container.parseError !== undefined) return undefined

  const layout = readLayout(container.document)
  const chosen = choosePreviewPage(layout)
  if (chosen === undefined) return undefined

  const settings = readRenderSettings(container.document)
  const scene = renderPage(
    chosen.page,
    aspectRatioOf(source.device, chosen.orientation),
    settings,
    source.language
  )
  redactScene(scene, redactedRanks(layout, chosen))

  const { widthPx, heightPx } = viewBoxSize(scene)
  return {
    bytes: new TextEncoder().encode(new XMLSerializer().serializeToString(scene)),
    ref: {
      mediaType: PREVIEW_MEDIA_TYPE,
      widthPx,
      heightPx,
      orientation: chosen.orientation,
      pageRank: chosen.pageRank
    }
  }
}

/* ------------------------------------------------------------------------- l'affichage */

/**
 * Relit une vignette rangée et la rend prête à poser dans le document.
 *
 * ## Pourquoi on désinfecte ce qu'on a nous-mêmes écrit
 *
 * Poser du SVG dans le document est le seul geste de ce fichier qui puisse coûter quelque
 * chose : un `<script>` ou un attribut `on…` s'y exécuterait avec tous les droits de
 * l'éditeur. Les octets viennent d'IndexedDB, c'est-à-dire d'un magasin que **n'importe
 * quel code de cette origine** peut écrire — et l'archive de bibliothèque, elle, n'en
 * transporte plus (`transfer.ts`), ce qui ferme la porte d'entrée principale. Le passage
 * ci-dessous ferme la seconde, pour le prix de dix lignes : prudent par défaut.
 */
export function readPreviewScene(bytes: Uint8Array): SVGSVGElement | undefined {
  const text = new TextDecoder().decode(bytes)
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = parsed.documentElement
  if (root === null || root.tagName.toLowerCase() !== 'svg') return undefined
  if (parsed.querySelector('parsererror') !== null) return undefined
  const scene = document.importNode(root, true) as unknown as SVGSVGElement
  sanitize(scene)
  return scene
}

function sanitize(node: Element): void {
  for (const attribute of [...node.attributes]) {
    const name = attribute.name.toLowerCase()
    // Les gestionnaires d'événements et tout ce qui pourrait pointer ailleurs : la
    // vignette est un dessin, elle n'a besoin ni de l'un ni de l'autre.
    if (name.startsWith('on') || name === 'href' || name === 'xlink:href') {
      node.removeAttribute(attribute.name)
    }
  }
  for (const child of [...node.children]) {
    const tag = child.tagName.toLowerCase()
    if (tag === 'script' || tag === 'iframe' || tag === 'object' || tag === 'embed') {
      child.remove()
      continue
    }
    sanitize(child)
  }
}
