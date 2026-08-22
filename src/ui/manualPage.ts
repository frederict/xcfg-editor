import '../../docs-app/manuel.css'
import { UI_FALLBACK_LANGUAGE, type Translator, type UiLanguage } from '../i18n'

/**
 * Le manuel d'utilisation, en pleine page, dans la langue du pilote.
 *
 * **Une page, pas une modale.** Treize chapitres ne se lisent pas dans une boîte : on y
 * revient, on cherche, on garde sa place. Une vue à part rend le défilement au navigateur
 * et laisse le manuel occuper toute la largeur qu'il mérite.
 *
 * Le fragment est importé en `?raw` : c'est du **texte du projet**, figé au moment de la
 * construction, dans lequel rien de ce que le pilote ouvre n'entre jamais. C'est ce qui
 * rend `innerHTML` sans danger ici — et ce qui le rendrait dangereux ailleurs.
 *
 * ## Un morceau par langue, un seul téléchargé
 *
 * `import.meta.glob` **sans `eager`** rend un objet de chargeurs, pas des contenus : Vite
 * émet un morceau par fragment, et seul celui qu'on appelle part sur le réseau. Les cinq
 * manuels pèsent ensemble 80 ko compressés ; un pilote qui ouvre l'aide en télécharge
 * **un**. Un `eager: true` les collerait tous les cinq dans ce module — pour une
 * application qu'on ouvre parfois en 3G au décollage, l'écart n'est pas un détail.
 *
 * Le module entier n'est de toute façon atteint que par `import()`, comme les cinq autres
 * morceaux chargés à la demande : le premier écran ne paie rien.
 */
const MANUALS = import.meta.glob<string>('../../docs-app/manuel.*.html', {
  query: '?raw', import: 'default'
})

/** Le chargeur de la langue demandée, ou celui du repli si elle n'a pas de manuel. */
function manualLoader(language: UiLanguage): (() => Promise<string>) | undefined {
  return MANUALS[`../../docs-app/manuel.${language}.html`]
    ?? MANUALS[`../../docs-app/manuel.${UI_FALLBACK_LANGUAGE}.html`]
}

/**
 * L'ancre du sommaire, posée ici et non dans les cinq fragments.
 *
 * Elle ne sert qu'à la pastille de retour, qui est de l'interface : la poser dans le HTML
 * demanderait cinq modifications coordonnées pour un identifiant dont aucun des cinq
 * fichiers ne se sert.
 */
const TOC_ID = 'm-toc'

/** L'identifiant du titre du sommaire, pour nommer sa région de navigation. */
const TOC_TITLE_ID = 'm-toc-title'

/**
 * La hauteur, en pixels, sous laquelle un titre compte comme « dépassé ».
 *
 * 56 px pour la barre de tête collante, plus une marge de confort : sans elle, le chapitre
 * marqué changerait alors que son titre est encore lisible à l'écran.
 */
const PASSED_BELOW = 140

/**
 * Ranger le fragment en deux colonnes : le sommaire d'un côté, le texte de l'autre.
 *
 * Le HTML des cinq manuels n'est pas touché — il reste un fil unique, ce qui est ce que
 * la recherche du navigateur et l'impression demandent. Le déplacement se fait ici, sur
 * l'arbre, et il est **réversible par la seule feuille de style** : sous 64 rem, tout
 * retombe dans le fil, dans l'ordre du document.
 *
 * Cet ordre est justement pourquoi trois boîtes plutôt que deux. Ce qui précède le
 * sommaire dans le fragment — l'avertissement sur les données personnelles, la seule
 * chose que ce manuel doit dire même à qui ne le lira pas — part dans `.manual__lead`.
 * Sans lui, replier en une colonne le ferait passer SOUS le sommaire, c'est-à-dire sous
 * treize lignes de liens : `tests/docs/manuels.test.ts` exige l'inverse dans les cinq
 * langues, et il a raison.
 *
 * Rend le sommaire, ou `undefined` si le fragment n'en porte pas — auquel cas rien n'est
 * déplacé et le manuel s'affiche en un seul fil, ce qui reste juste.
 *
 * Exportée pour ce dernier cas : aucun des cinq manuels n'y tombe aujourd'hui, donc
 * `buildManualPage` ne permet pas de l'atteindre, et c'est justement le chemin qui ne
 * serait essayé par personne avant le jour où il servirait.
 */
export function layOutColumns(root: HTMLElement): HTMLElement | undefined {
  const toc = root.querySelector<HTMLElement>('.manual__toc')
  if (toc === null) return undefined

  const cols = document.createElement('div')
  cols.className = 'manual__cols'
  const lead = document.createElement('div')
  lead.className = 'manual__lead'
  const side = document.createElement('aside')
  side.className = 'manual__side'
  const text = document.createElement('div')
  text.className = 'manual__text'

  // `append` DÉPLACE le nœud : à chaque tour, `firstChild` est celui d'après.
  while (root.firstChild !== null && root.firstChild !== toc) lead.append(root.firstChild)
  side.append(toc)
  while (root.firstChild !== null) text.append(root.firstChild)

  cols.append(lead, side, text)
  root.append(cols)

  toc.id = TOC_ID
  const title = toc.querySelector('h2')
  if (title !== null) {
    title.id = TOC_TITLE_ID
    toc.setAttribute('aria-labelledby', TOC_TITLE_ID)
  }
  return toc
}

/**
 * Ramener une entrée dans la partie visible du sommaire, et rien d'autre.
 *
 * Sur une fenêtre courte, les treize entrées ne tiennent pas dans la colonne : elle défile
 * pour son compte (`overflow-y: auto`). Le chapitre courant y serait alors marqué sans
 * qu'on puisse le voir — un repère hors champ ne repère rien.
 *
 * `scrollIntoView` ferait l'affaire d'une ligne, et c'est le piège : il remonte de
 * conteneur en conteneur et **déplace aussi la page**. Un lecteur qui fait défiler son
 * texte verrait le sol bouger sous lui à chaque changement de chapitre. On écrit donc
 * dans le seul `scrollTop` de la colonne, qui ne peut rien emporter d'autre.
 */
function keepInSight(entry: Element, column: HTMLElement | null): void {
  if (column === null) return
  const seen = column.getBoundingClientRect()
  const target = entry.getBoundingClientRect()
  if (target.top < seen.top) column.scrollTop -= seen.top - target.top
  else if (target.bottom > seen.bottom) column.scrollTop += target.bottom - seen.bottom
}

/**
 * Marquer, au défilement, le chapitre où l'on se trouve.
 *
 * Un sommaire de treize entrées toujours visible pose aussitôt la question « où suis-je »,
 * et `aria-current="location"` y répond pour l'œil et pour le lecteur d'écran à la fois.
 *
 * L'observateur ne sert que de **déclencheur** : le chapitre courant est recalculé à
 * chaque fois par la position réelle des titres, ce qui est exact quel que soit le sens
 * du défilement et quel que soit le nombre de titres franchis d'un coup. Le raisonnement
 * inverse — déduire l'état des seules entrées reçues — se trompe dès qu'on saute.
 *
 * ## Pourquoi il se débranche tout seul
 *
 * `buildManualPage` ne rend aucune poignée de fermeture, et `main.ts` vide simplement son
 * cadre en changeant de vue : sans ce débranchement, chaque ouverture du manuel laisserait
 * derrière elle un observateur tenant en vie un arbre de mille nœuds. Détacher un élément
 * observé déclenche l'observateur, ce qui donne l'occasion de le constater — mais
 * seulement après une première présence à l'écran, sinon la toute première visite se
 * débrancherait elle-même avant d'avoir servi.
 *
 * Sans `IntersectionObserver` — un navigateur ancien, un test hors navigateur — le
 * sommaire reste un sommaire : il navigue, il ne dit simplement pas où l'on est.
 */
function followCurrentChapter(root: HTMLElement, toc: HTMLElement): void {
  if (typeof IntersectionObserver === 'undefined') return

  const links = new Map<string, Element>()
  for (const link of toc.querySelectorAll('a[href^="#"]')) {
    links.set((link.getAttribute('href') ?? '').slice(1), link)
  }
  const headings = [...root.querySelectorAll('h2[id]')].filter((heading) =>
    links.has(heading.id))
  if (headings.length === 0) return

  const mark = (): void => {
    let current = headings[0]
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top > PASSED_BELOW) break
      current = heading
    }
    for (const [id, link] of links) {
      if (id !== current?.id) {
        link.removeAttribute('aria-current')
        continue
      }
      link.setAttribute('aria-current', 'location')
      keepInSight(link, toc.parentElement)
    }
  }

  let wasShown = false
  const observer = new IntersectionObserver(() => {
    if (root.isConnected) {
      wasShown = true
      mark()
    } else if (wasShown) {
      observer.disconnect()
    }
  }, { rootMargin: '0px 0px -55% 0px' })
  for (const heading of headings) observer.observe(heading)
}

export async function buildManualPage(
  tr: Translator, onClose: () => void
): Promise<HTMLElement> {
  const load = manualLoader(tr.language)
  if (load === undefined) throw new Error(`aucun manuel pour ${tr.language}`)
  const manual = await load()

  const page = document.createElement('section')
  page.className = 'manual-page'

  const head = document.createElement('div')
  head.className = 'manual-page__head'
  const title = document.createElement('h1')
  title.className = 'manual-page__title'
  title.textContent = tr.t('app.manualTitle')
  const back = document.createElement('button')
  back.type = 'button'
  back.className = 'btn'
  back.textContent = tr.t('app.manualBack')
  back.addEventListener('click', onClose)
  head.append(title, back)

  // Le fragment porte lui-même `class="manual"`, qui est la racine de sa feuille de
  // style : l'envelopper d'un second conteneur de même classe dupliquerait ses marges.
  const body = document.createElement('div')
  body.innerHTML = manual

  page.append(head, body)

  const root = body.querySelector<HTMLElement>('.manual')
  if (root !== null) {
    const toc = layOutColumns(root)
    if (toc !== undefined) {
      followCurrentChapter(root, toc)
      // La pastille de retour au sommaire, hors de `.manual` : c'est de l'interface, et
      // dedans elle hériterait du soulignement que la feuille donne aux liens du texte.
      // Elle ne se voit qu'en une colonne — la feuille de style en décide seule.
      const jump = document.createElement('a')
      jump.className = 'manual-page__jump'
      jump.href = `#${TOC_ID}`
      jump.textContent = tr.t('app.manualToc')
      page.append(jump)
    }
  }
  return page
}
