import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'

/**
 * `WCompTaskSummary` — « Résumé de la manche ». Écart 2.6 de la revue des 75 visuels :
 * « texte deux fois trop petit et mise en page différente ».
 *
 * ## Ce que l'appareil dessine
 *
 * Il fallait une manche CHARGÉE et le mode « Navigation → Manche de compétition » actif
 * pour le voir : au sol et en vol libre, la cellule est entièrement vide. La seule
 * capture qui le montre est
 * `captures-air3/2026-08-21_planche-competition-7-carte-manche-et-resume.png`, cellule de
 * **627 × 323 px** :
 *
 * | | relevé |
 * |---|---|
 * | encre | `#505050`, 10 039 px, en demi-gras |
 * | bloc | x 666 à 952, y 415 à 709 — soit 13 à 299 et 18 à 312 dans la cellule |
 * | lignes | 10 (dont une vide), pas de titre |
 * | casse | 19 à 24 px, soit une police d'environ 28 px — 0,087 × la hauteur |
 *
 * **La mise en page, qui n'est ni « centrée » ni « alignée à gauche ».** Toutes les lignes
 * se centrent sur une même verticale, à x = 156 de la cellule — c'est-à-dire le milieu de
 * la ligne LA PLUS LONGUE (286 px), posée à 13 px du bord gauche. Autrement dit : un bloc
 * de la largeur de son contenu, collé à gauche, dont les lignes sont centrées entre
 * elles. C'est exactement ce que donne une vue Android en `wrap_content` avec
 * `gravity=center_horizontal`, et ce n'est pas ce que donnerait un centrage dans la
 * cellule : la moitié droite reste vide.
 *
 * Ce que nous dessinions : quatre lignes en deux colonnes justifiées gauche/droite, à
 * moitié de la taille.
 *
 * ## Ce que l'exemple vaut, et ce qu'il ne vaut pas
 *
 * **Le contenu d'une manche ne vit pas dans le fichier de pages.** Il vient du fichier de
 * tâche chargé dans l'appareil, et l'éditeur n'en a aucune connaissance. Ce que ce dessin
 * reproduit est donc la FORME — la structure d'en-tête, la ligne vide, les balises avec
 * leur rayon, la courante entre chevrons — avec des noms de balises neutres. Reprendre
 * ceux de la capture reviendrait à recopier la manche du propriétaire dans un dépôt
 * public sans nécessité.
 *
 * Les libellés (`COURSE`, `SSS ouvert`, `Fin de la manche`, `But`) sont relevés sur un
 * appareil en FRANÇAIS, le seul état capturé : XCTrack les traduit, et nous n'avons pas
 * mesuré les autres langues. Même réserve que pour « DÉCOLLAGE » et « Rien » (numeric.ts).
 */

/**
 * Les dix lignes, dans l'ordre de la capture. La chaîne vide est la ligne vide qui sépare
 * l'en-tête des balises — elle occupe sa hauteur, comme sur l'appareil.
 */
const EXAMPLE_LINES: string[] = [
  'COURSE',
  'SSS ouvert 14:40',
  'Fin de la manche 20:00',
  '',
  'D01 r=400 m',
  '> D01 r=8 km (SSS) <',
  'B02 r=7,50 km',
  'B03 r=13 km',
  'A04 r=2 km (ESS)',
  'A04 r=400 m (But)'
]

export function drawCompTaskSummary(_widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'xc-tasksum'

  const block = document.createElement('div')
  block.className = 'xc-tasksum__block'

  for (const text of EXAMPLE_LINES) {
    const line = document.createElement('div')
    line.className = 'xc-tasksum__line'
    // Une ligne vide n'a pas de contenu mais garde sa hauteur : c'est ce que fait
    // l'appareil, et c'est ce qui sépare l'en-tête des balises.
    line.textContent = text.length > 0 ? text : ' '
    block.append(line)
  }

  element.append(block)
  return element
}
