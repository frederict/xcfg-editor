import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readNumber } from '../../core/access'

/**
 * `WLiveMessage` — « Réception de messages » (libellé officiel `fr` du catalogue,
 * `src/catalog/widgetLabels.json`).
 *
 * **Recouvrement des boutons de navigation (comparaison au sol).** Sur `landscape[4]`
 * de `2026-08-20_backup-00.xcfg`, ce widget (`_bg: 100`) occupe une large bande
 * `X 0..10000 / Y 7586..10000` et se dessine APRÈS deux `WButtonNavig` — dans notre
 * premier rendu, cela recouvrait entièrement les deux boutons. Or
 * `docs/reference/captures-air3/vol-thermalassistant-boutonsnavig.png` montre ces deux
 * boutons parfaitement visibles sur l'appareil, en bas à droite. Conclusion : comme
 * `WButtonBrightness` (`touchZone.ts`), XCTrack ne peint RIEN pour `WLiveMessage` tant
 * qu'aucun message n'est arrivé — un fond opaque déclaré dans le fichier ne veut pas
 * dire un fond opaque dessiné. Ce recouvrement existe dans les 5 fichiers du corpus.
 *
 * **Traitement — adapté, pas identique à `WButtonBrightness`.** `WLiveMessage` rejoint
 * `registerTransparent` (`widgets/index.ts`, `registry.ts`) pour neutraliser fond et
 * cadre exactement comme les zones tactiles. Mais ce n'EST PAS une zone tactile : rien
 * à toucher ici, contrairement à `WButtonBrightness`/`WButtonNavig` — c'est un
 * afficheur qui a du contenu, seulement pas en permanence. La version précédente de ce
 * module simulait un panneau de messages toujours visible ; elle masquait donc
 * exactement ce que la capture dément. Le dessin ci-dessous ne simule plus aucun
 * message : il pose uniquement une marque discrète au survol (même mécanisme visuel
 * que `.xc-touch`, contour en pointillés + étiquette, mais sans `cursor: pointer` —
 * rien ne se touche ici), qui annonce l'espace réservé et son nombre de lignes prévu
 * (`line_count`), pour que le pilote comprenne pourquoi cet espace existe sans que
 * rien ne masque la carte ou les boutons dessous.
 *
 * Clés propres relevées sur les 10 occurrences du corpus (5 fichiers × 2 emplacements,
 * `landscape[3]` et `landscape[4]`, valeurs identiques partout) :
 * - `line_count` : toujours `2`. Nombre de lignes de message prévues — c'est la seule
 *   information reprise dans l'étiquette de survol, faute de savoir à quoi ressemble
 *   réellement le panneau une fois un message arrivé.
 * - `show_time` : toujours `300`. Non repris ici (n'a plus de contenu à horodater) —
 *   voir l'ancienne version de ce fichier (git blame) pour la réserve déjà documentée
 *   sur son sens exact, non tranchée et désormais sans objet.
 */

const PREFIX: Record<string, string> = { fr: 'Panneau de messages', en: 'Message panel' }

/** Line count is always an integer ≥ 0 in the corpus (always 2); a fractional or
 * negative value in a foreign file is clamped defensively rather than shown raw. */
function linesSuffix(count: number, language: string): string {
  const n = Math.max(0, Math.trunc(count))
  if (language === 'fr') return `${n} ligne${n > 1 ? 's' : ''} réservée${n > 1 ? 's' : ''}`
  return `${n} line${n === 1 ? '' : 's'} reserved`
}

function liveMessageLabel(widget: Widget, language: string): string {
  const prefix = PREFIX[language] ?? PREFIX.en!
  const rawCount = readNumber(widget.node, 'line_count')
  if (rawCount === undefined) return prefix
  return `${prefix} — ${linesSuffix(rawCount, language)}`
}

export function drawLiveMessage(widget: Widget, _settings: RenderSettings, language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-livemsg'

  // Étiquette : présente dans le DOM (sélectionnable, testable) mais masquée par CSS
  // sauf au survol — voir `.xc-livemsg__label` dans style.css. Rien dans ce module ne
  // pose de fond ni de bordure : le rendu normal ne doit littéralement rien afficher,
  // comme sur l'appareil.
  const label = document.createElement('span')
  label.className = 'xc-livemsg__label'
  label.textContent = liveMessageLabel(widget, language)
  element.append(label)

  return element
}
