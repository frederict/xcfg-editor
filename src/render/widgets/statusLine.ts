import type { Widget } from '../../model/widget'
import type { RenderSettings } from '../../model/preferences'
import { readBoolean } from '../../core/access'

/**
 * Rendu de `WStatusLine` — le bandeau d'indicateurs en haut d'écran : réception GPS,
 * `LIVE`, état des capteurs, batterie, de gauche à droite, sur un fond gris clair uni
 * `#e8e8e8`.
 *
 * **Refait sur `docs/reference/captures-air3/2026-08-21_barre-etat-reelle.png`** — la
 * barre d'état seule d'un AIR³ 7.2, 500 × 100 px, découpe 1:1 du widget réel
 * (6042..10000 × 0..1379, soit 507 × 99 px sur un écran 1280 × 720). Le recoupement avec
 * `2026-08-21_polices-reference.png`, qui montre la même barre non recadrée à gauche,
 * donne les mêmes tailles au pixel près. Ce que le rendu précédent ratait :
 *
 * - **le texte était trois fois trop petit** : il partait de la police du document
 *   (16 px dans le repère de rendu) alors que les capitales de `LIVE` mesurent 37 px et
 *   les chiffres de `100%` 39 px, soit une police d'environ 53 px ;
 * - **les éléments étaient collés à droite** ; sur l'appareil, ils remplissent la barre
 *   d'un bord à l'autre (0..493 sur 500) avec des écarts réguliers, ce qui revient à un
 *   groupe centré ;
 * - **le pictogramme des capteurs n'était pas le bon** : c'est un parapente, et c'est de
 *   loin le plus grand élément de la barre (87 px de haut sur 99, contre 33 pour le GPS
 *   et 32 pour la batterie) ;
 * - **la batterie n'a pas la forme retenue jusqu'ici** : pas un contour vide à demi
 *   rempli, mais un corps plein sombre (`#231f20`, relevé au pixel) portant des cellules
 *   vertes (`#8dc63f`) régulièrement espacées.
 *
 * **La taille du texte ne suit PAS la hauteur de la barre.** Deux captures le montrent :
 * la barre de `landscape[3]` (`ecran-landscape3-17widgets.png`, 480 × 74) affiche les
 * mêmes capitales à 36 px que celle-ci (507 × 99) à 37-39 px. Une taille proportionnelle
 * à la hauteur donnerait 27 px sur la première ; une taille constante d'environ 52 px
 * rend compte des deux à 5 % près. C'est le même constat que pour les titres de widgets
 * (voir `textMetrics.ts`), et c'est ce qui est implémenté — avec un plafond à 0,72 fois
 * la hauteur, pour qu'une barre très plate ne déborde pas. Les pictogrammes, eux, ne
 * suivent proprement ni la hauteur ni une taille fixe entre les deux captures (GPS 40 px
 * sur la barre de 74, 33 px sur celle de 99) : on suit la capture de référence, la plus
 * fraîche et la seule prise en pleine résolution du widget. **NON TRANCHÉ.**
 *
 * **Ce qui est délibérément NON reproduit — état de l'appareil, pas trait du widget.**
 * Le fichier `.xcfg` ne porte aucune clé de ces états ; les inventer ferait dire au rendu
 * quelque chose que la configuration ne dit pas.
 * - **L'éclair de charge** blanc en travers de la batterie : l'AIR³ était branché en USB
 *   au moment de la capture. Rien dans le fichier ne le commanderait.
 * - **`100%`** : niveau réel de l'instant. On garde un pourcentage d'exemple, comme les
 *   valeurs des widgets numériques (`numeric.ts`), et les cellules vertes le suivent.
 * - **Le trait rouge** qui barre `LIVE` ou le parapente quand le service ou les capteurs
 *   sont indisponibles (visible sur les deux, au sol, dans `ecran-landscape3-17widgets`).
 *
 * **`LIVE` est noir.** Trois états ont été vus successivement, ce qui vaut la peine
 * d'être posé clairement plutôt que de remplacer une supposition par une autre :
 * 1. au sol, 2026-08-20 : texte NOIR, barré de rouge (rendu-observe.md) ;
 * 2. en rejeu de trace : texte VERT avec un point vert, barré de rouge lui aussi
 *    (rendu-en-vol.md § 5) — d'où la correction qui avait fait passer notre rendu au
 *    vert ;
 * 3. au sol, 2026-08-21, appareil connecté : texte NOIR, point NOIR plein, **pas de
 *    trait**.
 * Le noir est donc la couleur de base de l'indicateur, le vert un état d'exécution
 * (suivi actif) et le trait rouge un autre (service indisponible) — ni l'un ni l'autre
 * n'a de clé dans le fichier. `showLive` dit seulement si l'indicateur doit APPARAÎTRE.
 * Une visionneuse statique dessine donc la forme neutre, celle qui n'affirme rien :
 * noir, non barré. C'est aussi, et ce n'est pas un hasard, ce que montre la capture la
 * plus récente et la seule prise en pleine résolution du widget.
 *
 * Relevé sur les 35 occurrences du corpus (5 fichiers) : chaque indicateur n'apparaît
 * dans le fichier — et donc à l'écran — que si sa clé est présente et vaut `true` ; son
 * absence équivaut à `false`, comme `_title`/`_unit` sur les widgets numériques
 * (numeric.ts). Deux profils bien distincts :
 * - `landscape[0..4]` (20 occurrences identiques) : showGps, showSensors, showLive,
 *   showLiveLabel, showBatteryIcon, showBatteryPercent tous à `true`, showTime à `false`.
 *   C'est le jeu de la capture de référence.
 * - `portrait[0..2]` (15 occurrences) : SEULES showTime et showLiveLabel sont écrites.
 *   showLive en est absent — le groupe LIVE ne s'affiche donc pas du tout sur ces pages
 *   malgré showLiveLabel à `true`, à la lecture la plus littérale des clés. Aucune
 *   capture ne couvre ce cas portrait : signalé comme non tranché dans le rapport.
 *
 * `soundMode` (`'WARN_MUTED'` sur 12 occurrences) n'a aucune contrepartie visuelle
 * décrite dans rendu-observe.md ni observée sur les captures : volontairement ignoré ici.
 */

/** Corps de la pile de batterie — mesuré au pixel sur la capture (35,31,32). */
const BATTERY_BODY = '#231f20'

/** Cellules vertes à l'intérieur du corps — mesuré au pixel (141,198,63). */
const BATTERY_GREEN = '#8dc63f'

/**
 * Pourcentage de batterie statique — valeur d'exemple, comme les valeurs des widgets
 * numériques (numeric.ts) : le niveau réel est un état d'exécution que le fichier ne
 * contient pas. Il commande aussi le nombre de cellules allumées.
 */
const EXAMPLE_BATTERY_PERCENT = 82

/** Heure statique — même exemple que WTime dans numeric.ts, pour rester cohérent. */
const EXAMPLE_TIME = '14:32'

/** Nombre de cellules du pictogramme de batterie. */
const BATTERY_CELLS = 5

/**
 * Icônes SVG en ligne — consigne explicite : pas d'emoji, pas de police d'icônes.
 *
 * GPS : parabole pleine en bas à gauche et deux arcs concentriques vers le haut à droite
 * (« antenne » émettant vers le satellite). La capture montre des traits plus épais et
 * plus effilés que ce dessin ; seule la structure est reprise, pas le tracé exact.
 */
const ICON_GPS = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">
  <path d="M2 22 L2 15 A7 7 0 0 1 9 22 Z" fill="currentColor" stroke="none"/>
  <path d="M3 10.5 A13.5 13.5 0 0 1 16.5 24"/>
  <path d="M4.5 3 A20 20 0 0 1 24 22.5"/>
</svg>`.trim()

/**
 * Capteurs : le parapente vu de face de XCTrack — voile en arc au-dessus, aile et
 * suspentes convergeant vers le pilote en dessous. Relevé sur la capture : le glyphe
 * occupe 76 × 87 px dans une barre de 99, l'arc de voile la moitié haute (y 6..45), le
 * corps la moitié basse (y 52..89). Silhouette reprise, tracé approché.
 *
 * Il n'est PAS barré ici : le trait rouge de la capture du 2026-08-20 signale des
 * capteurs indisponibles, un état d'exécution qu'aucune clé du fichier ne porte — même
 * raisonnement que pour `LIVE`, voir le commentaire de tête.
 */
const ICON_SENSORS = `
<svg viewBox="0 0 80 92" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M24 44 C 24 -2, 55 -2, 55 44" stroke-width="6"/>
  <path d="M4 51 L30 59" stroke-width="8"/>
  <path d="M75 51 L49 59" stroke-width="8"/>
  <path d="M29 59 L38.5 78" stroke-width="7"/>
  <path d="M50 59 L38.5 78" stroke-width="7"/>
  <path d="M38.5 74 L38.5 88" stroke-width="7"/>
  <path d="M13 70 L27 75" stroke-width="8"/>
  <path d="M66 70 L52 75" stroke-width="8"/>
</svg>`.trim()

/**
 * Batterie : corps plein sombre, téton à droite, cellules vertes à l'intérieur —
 * proportions relevées sur la capture (corps 77 × 32, téton 5 × 16, total 82 × 32, soit
 * un rapport 2,56). Le nombre de cellules allumées suit le pourcentage d'exemple ; la
 * capture, à 100 %, les montre toutes vertes.
 */
function batteryIcon(percent: number): string {
  const lit = Math.max(1, Math.min(BATTERY_CELLS, Math.round((percent / 100) * BATTERY_CELLS)))
  const cells: string[] = []
  for (let index = 0; index < lit; index += 1) {
    cells.push(`<rect x="${(3 + index * 6.7).toFixed(1)}" y="3" width="5.2" height="10" fill="${BATTERY_GREEN}"/>`)
  }
  return `
<svg viewBox="0 0 41 16" aria-hidden="true">
  <rect x="0" y="0" width="38" height="16" rx="2.5" fill="${BATTERY_BODY}"/>
  <rect x="38" y="5" width="3" height="6" rx="1" fill="${BATTERY_BODY}"/>
  ${cells.join('\n  ')}
</svg>`.trim()
}

function iconElement(className: string, svgMarkup: string): HTMLElement {
  const span = document.createElement('span')
  span.className = className
  span.innerHTML = svgMarkup
  return span
}

function shown(widget: Widget, key: string): boolean {
  return readBoolean(widget.node, key) === true
}

export function drawStatusLine(widget: Widget, _settings: RenderSettings, _language: string): HTMLElement {
  const bar = document.createElement('div')
  bar.className = 'xc-status'

  if (shown(widget, 'showGps')) {
    bar.append(iconElement('xc-status__icon xc-status__gps', ICON_GPS))
  }

  if (shown(widget, 'showLive')) {
    const live = document.createElement('span')
    live.className = 'xc-status__live'

    const dot = document.createElement('span')
    dot.className = 'xc-status__dot'
    live.append(dot)

    if (shown(widget, 'showLiveLabel')) {
      const label = document.createElement('span')
      label.className = 'xc-status__live-text'
      label.textContent = 'LIVE'
      live.append(label)
    }

    bar.append(live)
  }

  if (shown(widget, 'showSensors')) {
    bar.append(iconElement('xc-status__icon xc-status__sensors', ICON_SENSORS))
  }

  const showBatteryIcon = shown(widget, 'showBatteryIcon')
  const showBatteryPercent = shown(widget, 'showBatteryPercent')
  if (showBatteryIcon || showBatteryPercent) {
    const battery = document.createElement('span')
    battery.className = 'xc-status__battery'

    if (showBatteryIcon) {
      battery.append(iconElement('xc-status__icon xc-status__battery-icon', batteryIcon(EXAMPLE_BATTERY_PERCENT)))
    }

    if (showBatteryPercent) {
      const percent = document.createElement('span')
      percent.className = 'xc-status__percent'
      percent.textContent = `${EXAMPLE_BATTERY_PERCENT}%`
      battery.append(percent)
    }

    bar.append(battery)
  }

  // Position non confirmée par une capture (aucune ne porte showTime: true dans le
  // bandeau lui-même — voir le commentaire de tête) : placée en dernier, à l'extrémité
  // droite, par cohérence avec l'ordre du reste du bandeau.
  if (shown(widget, 'showTime')) {
    const time = document.createElement('span')
    time.className = 'xc-status__time'
    time.textContent = EXAMPLE_TIME
    bar.append(time)
  }

  return bar
}
