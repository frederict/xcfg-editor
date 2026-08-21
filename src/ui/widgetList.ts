import type { Device } from '../catalog/devices'
import { readableName } from '../catalog/widgetNames'
import type { Orientation } from '../model/grid'
import type { Page } from '../model/layout'
import type { Widget } from '../model/widget'
import { isBlankAtRest } from '../render/registry'
import { aspectRatioOf, formatMm, widgetSizeMm, type WidgetBox } from './views'

/**
 * La liste des widgets de la page, dans le bandeau.
 *
 * **Pourquoi elle existe.** `widgetAtPoint` (`ui/editor.ts`) est purement géométrique :
 * elle parcourt le tableau à l'envers et rend le premier widget dont le rectangle
 * contient le point. Un widget dont **aucun point** n'échappe aux rectangles des rangs
 * supérieurs n'est donc atteignable par **aucun clic**, quoi qu'il dessine. Mesuré sur
 * `Exemples/2026-08-20_pages-00.xcfg` : six widgets sur 105 sont dans ce cas — deux
 * `WButtonBrightness` sous l'assistant de thermique en `landscape[3]`, et en
 * `landscape[4]` deux `WButtonNavig`, `WCompDistanceToGoal` et `WCompAltitudeOverGoal`,
 * tous les quatre sous le `WLiveMessage` pleine largeur du bas.
 *
 * Le cas dur n'est pas celui des widgets invisibles : `WButtonNavig` **dessine** un
 * pictogramme que le pilote voit sur son instrument (`docs/reference/rendu-en-vol.md` § 4).
 * Un widget visible sur l'appareil et inatteignable dans l'éditeur : la liste est le seul
 * chemin qui y mène.
 *
 * **Deux marques, deux faits distincts, à ne pas confondre.**
 * - *Inatteignable au clic* : fait **géométrique**, calculé ici, propre à l'éditeur.
 * - *Ne dessine rien* : fait **de rendu** (`isBlankAtRest`, `render/registry.ts`), propre
 *   à l'appareil. Un `WLiveMessage` ne dessine rien au repos et reste pourtant au premier
 *   plan — c'est lui qui vole les clics des quatre autres, pas l'inverse.
 *
 * **« Inatteignable » ne veut pas dire « inutilisable ».** `ui/warnings.ts` dit du même
 * `WButtonBrightness` qu'il « reste actif au doigt » sur l'instrument, et c'est vrai :
 * l'appareil route le toucher vers le bouton du dessous, là où `widgetAtPoint` s'arrête
 * au rang supérieur. Les deux énoncés parlent de deux machines différentes, et les textes
 * de cette liste le disent explicitement — « dans l'éditeur », « ici » — pour qu'un pilote
 * ne lise pas une contradiction là où il n'y en a pas. Ne pas retirer ces précisions.
 *
 * **L'ordre est celui du fichier, rang 1 en haut.** Le fichier va du fond vers l'avant
 * (`Page.widgets` : « le premier est au fond, le dernier au-dessus »). Le rang affiché est
 * donc l'index du fichier, et non la convention inverse des logiciels de dessin — d'où les
 * deux étiquettes d'extrémité, « fond » en haut et « premier plan » en bas, sans lesquelles
 * un pilote habitué à Photoshop lirait la liste à l'envers.
 */

/* ==================================================================== inatteignables */

/**
 * Vrai si l'union des rectangles `covers` recouvre entièrement `target`.
 *
 * Méthode : compression de coordonnées. Les abscisses et ordonnées remarquables découpent
 * `target` en cellules ; le centre d'une cellule appartient soit entièrement, soit pas du
 * tout à chaque recouvrant. Il suffit donc de tester un point par cellule.
 *
 * Les bords comptent comme recouverts, exactement comme dans `widgetAtPoint`, qui teste
 * l'appartenance avec des inégalités larges : un résidu réduit à une ligne n'offre aucune
 * cible cliquable, et le prétendre atteignable serait un mensonge à l'échelle du pixel.
 */
export function coversEntirely(target: WidgetBox, covers: readonly WidgetBox[]): boolean {
  // Seuls les recouvrants qui touchent la cible comptent : sur une page de 21 widgets,
  // ce seul filtre divise le travail par cinq.
  const relevant = covers.filter(
    (c) => c.x1 < target.x2 && c.x2 > target.x1 && c.y1 < target.y2 && c.y2 > target.y1
  )
  if (relevant.length === 0) return false

  const xs = new Set<number>([target.x1, target.x2])
  const ys = new Set<number>([target.y1, target.y2])
  for (const c of relevant) {
    for (const value of [c.x1, c.x2]) if (value > target.x1 && value < target.x2) xs.add(value)
    for (const value of [c.y1, c.y2]) if (value > target.y1 && value < target.y2) ys.add(value)
  }
  const columns = [...xs].sort((a, b) => a - b)
  const rows = [...ys].sort((a, b) => a - b)

  for (let i = 0; i < columns.length - 1; i += 1) {
    const x = (columns[i]! + columns[i + 1]!) / 2
    for (let j = 0; j < rows.length - 1; j += 1) {
      const y = (rows[j]! + rows[j + 1]!) / 2
      let hit = false
      for (const c of relevant) {
        if (x >= c.x1 && x <= c.x2 && y >= c.y1 && y <= c.y2) { hit = true; break }
      }
      if (!hit) return false
    }
  }
  return true
}

/** Vrai si le rectangle offre une surface cliquable — le même refus que `widgetAtPoint`. */
function grabbable(box: WidgetBox): boolean {
  return box.x2 > box.x1 && box.y2 > box.y1
}

/**
 * Pour chaque widget, dans l'ordre du fichier : vrai si **aucun clic sur la page ne peut
 * l'atteindre**.
 *
 * Deux causes, et une seule conséquence pour le pilote :
 * 1. son rectangle est vide ou inversé — `widgetAtPoint` le saute purement et simplement ;
 * 2. les rangs supérieurs le recouvrent entièrement.
 *
 * La transparence n'entre pas dans ce calcul : `widgetAtPoint` ne regarde que la
 * géométrie, un widget qui ne dessine rien intercepte le clic tout autant qu'un autre.
 * C'est précisément ce qui rend le résultat contre-intuitif, et ce que la liste doit dire.
 */
export function unreachableWidgets(boxes: readonly WidgetBox[]): boolean[] {
  return boxes.map((box, index) => {
    if (!grabbable(box)) return true
    return coversEntirely(box, boxes.slice(index + 1).filter(grabbable))
  })
}

/* ============================================================================ la vue */

/** Ce que la liste dit d'un widget, calculé une fois par construction. */
export interface WidgetListEntry {
  /** Rang dans le tableau `widgets` de la page, à partir de 0 — la sélection de `main.ts`. */
  index: number
  shortName: string
  /** Le libellé officiel, dans la langue de la session. */
  name: string
  widthMm: number
  heightMm: number
  /** Aucun clic sur la page ne peut l'atteindre — voir `unreachableWidgets`. */
  unreachable: boolean
  /** L'appareil n'en peint aucun contenu au repos — voir `isBlankAtRest`. */
  blank: boolean
}

export function widgetListEntries(
  widgets: readonly Widget[], device: Device, orientation: Orientation, language: string
): WidgetListEntry[] {
  const unreachable = unreachableWidgets(widgets)
  return widgets.map((widget, index) => {
    const size = widgetSizeMm(widget, device, orientation)
    return {
      index,
      shortName: widget.shortName,
      name: readableName(widget.shortName, language),
      widthMm: size.widthMm,
      heightMm: size.heightMm,
      unreachable: unreachable[index] === true,
      blank: isBlankAtRest(widget.shortName)
    }
  })
}

export interface WidgetListOptions {
  page: Page
  device: Device
  orientation: Orientation
  language: string
  /** Le rang sélectionné à la construction, ou `undefined`. */
  selection: number | undefined
  /** Appelé quand le pilote choisit une ligne. `main.ts` décide de la suite. */
  onSelect: (index: number) => void
}

export interface WidgetList {
  element: HTMLElement
  /** Met en évidence le rang donné, sans rien reconstruire ni rappeler `onSelect`. */
  select: (index: number | undefined) => void
  /** Ce que la liste a calculé — de quoi le vérifier sans lire le DOM. */
  entries: WidgetListEntry[]
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

/**
 * La vignette de repérage : la page en miniature, le widget en plein.
 *
 * C'est **le** discriminant de la liste, et il a été choisi contre les deux autres
 * candidats. Le nom lisible ne distingue rien — la page `landscape[0]` porte huit
 * homonymes potentiels et le corpus jusqu'à quatre `WAltitude` sur une même page. La
 * taille en millimètres distingue mieux, mais elle ne dit pas *où* : entre deux widgets de
 * même gabarit, le pilote ne peut toujours pas rattacher la ligne au rectangle qu'il a
 * sous les yeux. La vignette dit position **et** taille d'un coup d'œil, dans le repère
 * même de la page dessinée juste au-dessus — c'est le seul des trois qui fasse le pont
 * entre la liste et le rendu.
 *
 * Elle est purement décorative pour l'assistance vocale (`aria-hidden`) : ce qu'elle
 * montre, l'intitulé accessible de la ligne le dit en toutes lettres, taille comprise.
 */
function thumbnail(widget: Widget, aspectRatio: number): HTMLElement {
  const map = el('span', 'wlist__map')
  map.setAttribute('aria-hidden', 'true')
  map.style.aspectRatio = String(aspectRatio)
  const mark = el('span', 'wlist__mark')
  mark.style.left = `${widget.x1 / 100}%`
  mark.style.top = `${widget.y1 / 100}%`
  // Un widget de largeur nulle disparaîtrait : la vignette lui laisse un trait, qui dit
  // « il est là, et il est plat » — le rectangle dégénéré est justement un cas à voir.
  mark.style.width = `${Math.max(2, (widget.x2 - widget.x1) / 100)}%`
  mark.style.height = `${Math.max(2, (widget.y2 - widget.y1) / 100)}%`
  map.append(mark)
  return map
}

/** L'intitulé lu par l'assistance vocale : tout ce que la ligne montre, en toutes lettres. */
function spokenLabel(entry: WidgetListEntry, total: number): string {
  const parts = [
    `Rang ${entry.index + 1} sur ${total}`,
    entry.name,
    `${formatMm(entry.widthMm)} sur ${formatMm(entry.heightMm)} millimètres`
  ]
  if (entry.unreachable) parts.push('inatteignable au clic dans cet éditeur')
  if (entry.blank) parts.push('ne dessine rien sur l’appareil')
  return parts.join(', ')
}

/**
 * La liste, prête à être posée dans le bandeau.
 *
 * Sémantique `listbox` / `option` : c'est un choix unique parmi des rangs, pas une
 * navigation. La sélection suit le focus, comme dans une liste à choix unique — flèches
 * pour parcourir, Origine et Fin pour les extrémités, tabulation mobile (« roving
 * tabindex ») pour n'avoir qu'un arrêt de tabulation sur l'ensemble.
 */
export function renderWidgetList(options: WidgetListOptions): WidgetList {
  const { page, device, orientation, language } = options
  const widgets = page.widgets
  const entries = widgetListEntries(widgets, device, orientation, language)
  const aspectRatio = aspectRatioOf(device, orientation)
  const blocked = entries.filter((entry) => entry.unreachable).length

  const root = el('section', 'wlist')

  // Le nombre de rangs n'est pas répété ici : la barre de la page le dit déjà (« 21
  // widgets »), et les deux étiquettes d'extrémité le redisent en clair. La place ainsi
  // gagnée tient l'en-tête sur une seule ligne, soit un rang de plus à l'écran dans un
  // bandeau dont la hauteur est bornée.
  const head = el('div', 'wlist__head')
  head.append(el('h3', 'wlist__title', 'Gadgets de la page'))
  if (blocked > 0) {
    const alert = el(
      'span', 'wlist__alert',
      plural(blocked, 'inatteignable dans l’éditeur', 'inatteignables dans l’éditeur')
    )
    alert.title =
      'Ces gadgets sont entièrement recouverts par des rangs supérieurs : ici, aucun clic ' +
      'sur la page ne les atteint, et cette liste est le seul chemin qui y mène. Sur ' +
      'l’instrument, ils restent à leur place — un bouton d’action ainsi recouvert ' +
      'continue de répondre au doigt.'
    head.append(alert)
  }
  root.append(head)

  if (widgets.length === 0) {
    root.append(el('p', 'wlist__empty', 'Cette page ne porte aucun gadget.'))
    return { element: root, select: () => {}, entries }
  }

  // Les deux extrémités portent leur sens : le fichier va du fond vers l'avant, et rien
  // dans une liste numérotée ne le dit tout seul.
  root.append(el('p', 'wlist__edge', 'Rang 1 · au fond'))

  const list = el('ul', 'wlist__rows')
  list.setAttribute('role', 'listbox')
  list.setAttribute('aria-label', 'Gadgets de la page, du fond vers le premier plan')

  const rows: HTMLLIElement[] = []
  let current = options.selection

  const choose = (index: number, focus: boolean): void => {
    if (index < 0 || index >= rows.length) return
    apply(index)
    if (focus) rows[index]?.focus()
    options.onSelect(index)
  }

  entries.forEach((entry) => {
    const widget = widgets[entry.index]!
    const row = el('li', 'wlist__row')
    row.setAttribute('role', 'option')
    row.dataset.index = String(entry.index)
    row.dataset.shortName = entry.shortName
    // Les deux faits, lisibles depuis un test ou un harnais sans dépendre du style.
    row.dataset.unreachable = entry.unreachable ? 'oui' : 'non'
    row.dataset.blank = entry.blank ? 'oui' : 'non'
    if (entry.unreachable) row.classList.add('wlist__row--blocked')
    if (entry.blank) row.classList.add('wlist__row--blank')
    row.setAttribute('aria-label', spokenLabel(entry, widgets.length))

    row.append(
      el('span', 'wlist__rank', String(entry.index + 1)),
      thumbnail(widget, aspectRatio)
    )

    const text = el('span', 'wlist__text')
    text.append(
      el('span', 'wlist__name', entry.name),
      el('span', 'wlist__size', `${formatMm(entry.widthMm)} × ${formatMm(entry.heightMm)} mm`)
    )
    row.append(text)

    const flags = el('span', 'wlist__flags')
    if (entry.unreachable) {
      const flag = el('span', 'wlist__flag wlist__flag--blocked', 'inatteignable ici')
      flag.title =
        'Dans cet éditeur, aucun clic sur la page ne peut atteindre ce gadget : les rangs ' +
        'supérieurs le recouvrent entièrement, et cette liste est le seul chemin qui y ' +
        'mène. Sur l’instrument, il reste à sa place — un bouton d’action ainsi recouvert ' +
        'continue de répondre au doigt.'
      flags.append(flag)
    }
    if (entry.blank) {
      // « sans dessin » se lisait comme une limite de cet éditeur, alors que c'est un
      // fait de l'appareil : le gadget est bien là, il ne peint rien tant qu'il n'a rien
      // à montrer. La palette dit déjà cela avec ces mots-là ; deux écrans, un mot.
      const flag = el('span', 'wlist__flag wlist__flag--blank', 'rien au repos')
      flag.title =
        'Sur l’appareil, ce type ne peint rien au repos. Il occupe pourtant sa place et ' +
        'intercepte les clics comme n’importe quel autre gadget.'
      flags.append(flag)
    }
    if (flags.childElementCount > 0) row.append(flags)

    row.addEventListener('click', () => choose(entry.index, false))
    rows.push(row)
    list.append(row)
  })

  function apply(index: number | undefined): void {
    current = index
    rows.forEach((row, position) => {
      const selected = position === index
      row.setAttribute('aria-selected', String(selected))
      row.classList.toggle('wlist__row--selected', selected)
      // Tabulation mobile : un seul arrêt pour toute la liste, sur la ligne choisie —
      // à défaut, sur la première, pour qu'elle reste atteignable au clavier.
      row.tabIndex = selected || (index === undefined && position === 0) ? 0 : -1
    })
    if (index !== undefined) {
      // La sélection peut venir de la page : la ligne correspondante doit se montrer.
      rows[index]?.scrollIntoView({ block: 'nearest' })
    }
  }

  list.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const start = current ?? 0
    switch (event.key) {
      case 'ArrowDown': choose(start + 1 > rows.length - 1 ? start : start + 1, true); break
      case 'ArrowUp': choose(Math.max(0, start - 1), true); break
      case 'Home': choose(0, true); break
      case 'End': choose(rows.length - 1, true); break
      case 'Enter':
      case ' ': choose(start, true); break
      default: return
    }
    // Les flèches appartiennent ici à la liste : sans cela, le bandeau étant à l'intérieur
    // du cadre d'édition, elles déplaceraient aussi le widget sélectionné d'une cellule.
    event.preventDefault()
    event.stopPropagation()
  })

  apply(current)
  root.append(list)
  root.append(el('p', 'wlist__edge', `Rang ${widgets.length} · au premier plan`))

  return { element: root, select: apply, entries }
}
